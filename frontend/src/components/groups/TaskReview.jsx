import { useCallback, useEffect, useState } from 'react';
import api from '../../api/client';
import { downloadFile } from '../../api/downloadFile';
import { useAuth } from '../../context/useAuth';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { DeadlineInfo } from '../ui/DeadlineInfo';
import { PrivateComments } from './PrivateComments';

export function TaskReview({ groupId, taskId }) {
  const { user } = useAuth(); const [task, setTask] = useState(null); const [scores, setScores] = useState({});
  const [feedback, setFeedback] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [policyDeadline, setPolicyDeadline] = useState(''); const [policyPenalty, setPolicyPenalty] = useState('');
  const endpoint = `/workflow/groups/${groupId}/milestones/${taskId}`;
  const load = useCallback(async () => {
    try { const result = await api.get(endpoint); setTask(result.data.data); setError(''); }
    catch (err) { setError(err.response?.data?.message || 'Milestone could not be loaded.'); }
  }, [endpoint]);
  useEffect(() => { load(); }, [load]); useLiveRefresh(load);
  const grade = async (event) => {
    event.preventDefault(); if (!window.confirm('Submit and lock this group grade?')) return;
    setBusy(true);
    try { await api.post(`${endpoint}/grade`, { scores, feedback }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Grade could not be saved. Refresh before retrying.'); }
    finally { setBusy(false); }
  };
  const confirmPolicy = async (event) => {
    event.preventDefault(); if (!window.confirm('Record these verified historical submission settings? Existing grades are preserved.')) return;
    setBusy(true);
    try { await api.post(`${endpoint}/submission-policy`, { deadline: new Date(policyDeadline).toISOString(), late_penalty_percent: Number(policyPenalty) }); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Policy confirmation could not be saved.'); }
    finally { setBusy(false); }
  };
  const download = async (url, name) => { try { await downloadFile(url, name); } catch { setError('File could not be downloaded.'); } };
  return <section className="workflow-card">
    {error && <p role="alert" className="workflow-error">{error} <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button></p>}
    {task && <><h3>{task.title}</h3><DeadlineInfo value={task.deadline} /><p className="preserve-lines">{task.details}</p>
      {task.document_url && <button className="btn btn-secondary" onClick={() => download(task.document_url, task.document_name)}>Instructions</button>}
      <p>{task.submission ? `Submitted by ${task.submission.submitted_by_name}${task.submission.is_late ? ' (late)' : ''}` : 'No submission yet'}</p>
      {task.submission && <button className="btn btn-secondary" onClick={() => download(task.submission.file_url, task.submission.file_name)}>Download Group Submission</button>}
      <p>Late penalty: {task.submission?.late_penalty_percent ?? task.late_penalty_percent ?? 0}% of earned marks.</p>
      {!task.rubrics?.length ? <p>Rubric not configured. Grading is unavailable.</p> : task.rubrics.map((r) => <p key={r.id}><strong>{r.question}</strong> · {r.weight} marks</p>)}
      {task.grade && <div><h4>Locked Group Grade</h4><p>Raw: {task.grade.raw_score} · Deduction: {task.grade.deduction} · Final: {task.grade.final_score}/{task.grade.max_possible_score}</p><p className="preserve-lines">{task.grade.feedback}</p></div>}
      {task.submission && !task.grade && (task.submission.deadline_snapshot == null || task.submission.late_penalty_percent == null) && <div role="status"><p>Historical submission policy needs Manager confirmation before grading.</p>{user?.role === 'pbl_manager' && <form className="workflow-form" onSubmit={confirmPolicy}><label>Verified Original Deadline<input type="datetime-local" required value={policyDeadline} onChange={event => setPolicyDeadline(event.target.value)} /></label><label>Verified Late Penalty (%)<input type="number" required min="0" max="100" step="1" value={policyPenalty} onChange={event => setPolicyPenalty(event.target.value)} /></label><button className="btn btn-secondary" disabled={busy}>Confirm Historical Policy</button></form>}</div>}
      {user?.role === 'teacher'  && !task.grade && task.submission && task.group_status === 'approved' && Boolean(task.rubrics?.length) && <form className="workflow-form" onSubmit={grade}>
        {task.rubrics.map((r) => <label key={r.id}>{r.question}<select required value={scores[String(r.id)] ?? ''} onChange={(e) => setScores({ ...scores, [String(r.id)]: Number(e.target.value) })}><option value="">Choose score</option>{[0, 1, 2, 3, 4, 5].map((score) => <option key={score} value={score}>{score}: {r.levels?.[String(score)] || ''}</option>)}</select></label>)}
        <label>Group Feedback<textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={20000} /></label><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Submit and Lock Grade'}</button>
      </form>}
      {(user?.role === 'teacher' || user?.role === 'pbl_manager') && <PrivateComments groupId={groupId} taskId={taskId} reviewer />}
    </>}
  </section>;
}
