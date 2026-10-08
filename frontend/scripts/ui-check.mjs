// Headless checks use a disposable browser profile and the isolated QA fixture server.
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const origin = 'http://127.0.0.1:5174';
const out = path.resolve('../.qa');
await mkdir(out, { recursive: true });
const browser = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', [
  '--headless', '--no-first-run', '--disable-default-apps', '--remote-debugging-port=0',
  `--user-data-dir=${path.join(out, `browser-${randomUUID()}`)}`, 'about:blank',
], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
const endpoint = await new Promise((resolve, reject) => {
  let output = '';
  const timer = setTimeout(() => reject(new Error('Headless browser did not expose its own endpoint.')), 15000);
  browser.stderr.on('data', (chunk) => {
    output += chunk.toString();
    const match = output.match(/DevTools listening on (ws:\/\/[^\s]+)/);
    if (match) { clearTimeout(timer); resolve(match[1]); }
  });
  browser.once('error', reject);
});
let sequence = 0;
const pending = new Map();
const socket = new WebSocket(endpoint);
await new Promise((resolve) => socket.addEventListener('open', resolve, { once: true }));
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(message.params.exceptionDetails));
  if (message.id && pending.has(message.id)) {
    const request = pending.get(message.id); pending.delete(message.id);
    if (message.error) request.reject(new Error(JSON.stringify(message.error))); else request.resolve(message.result);
  }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++sequence; pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params, ...(sessionId && { sessionId }) }));
  });
}
const target = await send('Target.createTarget', { url: 'about:blank' });
const session = await send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
const sid = session.sessionId;
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sid);
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fixtureResponse = await fetch('http://127.0.0.1:5001/qa-fixtures');
const { group_id: qaGroupId, task_id: qaTaskId } = await fixtureResponse.json();
const report = [];
try {
  await send('Page.enable', {}, sid);
  await send('Runtime.enable', {}, sid);
  await send('Emulation.setTimezoneOverride', { timezoneId: 'Asia/Karachi' }, sid);
  await send('Page.navigate', { url: `${origin}/login` }, sid);
  await pause(1800);
  for (const alias of ['manager', 'student', 'create', 'teacher', 'evaluator']) {
    // Authentication is test setup against the dedicated local fixture database.
    const response = await fetch(`${origin}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `qa-${alias}@bnu.edu.pk`, password: 'TestWorkflow123!' }) });
    const auth = await response.json();
    if (!auth.success) throw new Error(`QA login failed for ${alias}`);
    await evaluate(`sessionStorage.setItem('pbl_token', ${JSON.stringify(auth.data.token)}); sessionStorage.setItem('pbl_user', ${JSON.stringify(JSON.stringify(auth.data.user))}); localStorage.clear();`);
    const prefix = alias === 'manager' ? 'manager' : alias === 'create' ? 'student' : alias;
    const routes = alias === 'manager' ? ['/manager/iterations', '/manager/rubric-templates', '/manager/iterations/submissions', '/manager/groups', '/manager/evaluators/add', '/manager/groups/' + qaGroupId] : alias === 'student' ? ['/student/group/my', '/student/iterations', '/student/announcements', '/student/iterations/' + qaTaskId] : alias === 'create' ? ['/student/group/create'] : [`/${prefix}/dashboard`, `/${prefix}/announcements`];
    for (const route of routes) {
      for (const width of [1366, 390]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: width === 390 ? 844 : 768, deviceScaleFactor: 1, mobile: width === 390 }, sid);
        const oldOrigin = await evaluate('performance.timeOrigin');
        await send('Page.navigate', { url: origin + route }, sid);
        for (let attempt = 0; attempt < 60; attempt++) { await pause(500); if (await evaluate(`performance.timeOrigin !== ${oldOrigin} && document.readyState === 'complete' && document.querySelector('h1,h2')?.textContent`)) break; }
        for (let attempt = 0; attempt < 40; attempt++) { await pause(500); if (!await evaluate(`/Loading|Checking group eligibility|Fetching/.test(document.body.innerText)`)) break; }
        await pause(500);
        const page = await evaluate(`({text:document.body.innerText, width:document.documentElement.scrollWidth, viewport:innerWidth, heading:document.querySelector('h1,h2')?.textContent, buttons:Array.from(document.querySelectorAll('button')).map(b=>b.textContent.trim())})`);
        const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false }, sid);
        const filename = `${alias}-${route.replaceAll('/', '-')}-${width}.png`;
        await writeFile(path.join(out, filename), Buffer.from(screenshot.data, 'base64'));
        report.push({ alias, route, width, heading: page.heading, overflow: page.width > page.viewport + 1, text: page.text.slice(0, 500), screenshot: filename });
        if (!page.heading && !page.text.includes('No milestones') && !page.text.includes('Create Sprint')) throw new Error(`Blank route: ${route}: ${page.text}`);
        if (page.text.includes('Internal Server Error')) throw new Error(`Server error on ${route}`);
        if (route === '/manager/iterations' && width === 1366) {
          await evaluate(`document.querySelector('.edit-menu button').click()`); await pause(300);
          if (!await evaluate(`!!document.querySelector('[role=menu]') && getComputedStyle(document.querySelector('[role=menu]')).position === 'fixed'`)) throw new Error('Edit actions are clipped or unavailable');
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' }, sid); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' }, sid);
          await evaluate(`Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'Create Sprint').click()`);
          await pause(500);
          const modal = await evaluate(`({ fields: Array.from(document.querySelectorAll('[role="dialog"] input,[role="dialog"] textarea')).map(el => el.closest('label')?.textContent || el.placeholder), focused: !!document.querySelector('[role="dialog"]')?.contains(document.activeElement) })`);
          if (modal.fields.length !== 2 || !modal.focused) throw new Error('Sprint editor fields or initial focus are incorrect: ' + JSON.stringify(modal));
          await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape' }, sid);
          await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape' }, sid);
          await pause(250);
          if (await evaluate(`!!document.querySelector('[role="dialog"]')`)) throw new Error('Escape did not close the Sprint editor');
        }
        if (route === '/student/announcements' && width === 390) {
          await evaluate(`document.querySelector('.announcement-heading').click()`);
          for (let attempt = 0; attempt < 20; attempt++) { await pause(500); if (await evaluate(`document.body.innerText.includes('0 unread announcements')`)) break; }
          if (!await evaluate(`document.body.innerText.includes('0 unread announcements') && document.querySelector('.notification-trigger')?.getAttribute('aria-label').includes('0 unread')`)) throw new Error('Announcement read state did not synchronize with the bell');
          await evaluate(`document.querySelector('.notification-trigger').click()`); await pause(500);
          if (!await evaluate(`document.querySelector('.notification-panel')?.innerText.includes('Show More')`)) throw new Error('Notification history action is missing');
          await evaluate(`Array.from(document.querySelectorAll('.notification-panel button')).find(b => b.textContent === 'Show More').click()`); await pause(500);
          if (await evaluate('location.pathname') !== '/student/announcements') throw new Error('Show More did not open role-specific history');
        }
      }
    }
  }
  await writeFile(path.join(out, 'ui-report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ checked: report.length, overflow: report.filter((r) => r.overflow), report: path.join(out, 'ui-report.json') }, null, 2));
} finally {
  await writeFile(path.join(out, 'ui-report.json'), JSON.stringify(report, null, 2));
  await send('Browser.close').catch(() => {});
  socket.close();
}
