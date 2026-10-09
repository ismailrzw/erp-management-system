import { useCallback, useEffect, useRef, useState } from 'react';
import api from '../../api/client';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

export function PrivateComments({ taskId, groupId, recipients = [], reviewer = false }) {
  const [comments, setComments] = useState([]); const [content, setContent] = useState('');
  const [recipient, setRecipient] = useState(''); const [replyTo, setReplyTo] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const key = useRef(null);
  const endpoint = reviewer ? `/workflow/groups/${groupId}/milestones/${taskId}/comments` : `/student/iterations/${taskId}/comments`;
  const load = useCallback(async () => {
    try { const result = await api.get(endpoint); setComments(result.data.data || []); setError(''); }
    catch (err) { setError(err.response?.data?.message || 'Private comments could not be loaded.'); }
  }, [endpoint]);
  useEffect(() => { load(); }, [load]); useLiveRefresh(load);
  const send = async (event) => {
    event.preventDefault(); setBusy(true); setError(''); key.current ||= crypto.randomUUID();
    try {
      await api.post(endpoint, { content, recipient_id: recipient, reply_to: replyTo, client_key: key.current });
      key.current = null; setContent(''); await load();
    } catch (err) { setError(err.response?.data?.message || 'Message not confirmed. Retry keeps the same identifier to prevent duplicates.'); }
    finally { setBusy(false); }
  };
  return <section className="workflow-card"><h3>Private Comments</h3><p>Visible only to the student sender and selected reviewer.</p>
    {error && <p role="alert" className="workflow-error">{error} <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button></p>}
    {comments.map((c) => <article key={c._id} className="workflow-card"><strong>{c.author_name}</strong><small> · {new Date(c.created_at).toLocaleString()}</small><p className="preserve-lines">{c.content}</p>{reviewer && <button className="btn btn-ghost btn-sm" onClick={() => setReplyTo(c._id)}>Reply privately</button>}</article>)}
    {(!reviewer && !recipients.length) ? <p>The assigned Supervisor or milestone creator is unavailable. Contact the Manager.</p> : <form className="workflow-form" onSubmit={send}>
      {reviewer ? <p>{replyTo ? 'Replying to the selected conversation.' : 'Select a private comment above to reply.'}</p> : <label>Send to<select value={recipient} required onChange={(e) => { setRecipient(e.target.value); key.current = null; }}><option value="">Select recipient</option>{recipients.map((r) => <option key={r.id} value={r.id}>{r.name} ({r.kind})</option>)}</select></label>}
      <label>Message<textarea required maxLength={5000} value={content} onChange={(e) => { setContent(e.target.value); key.current = null; }} disabled={busy} /></label><button className="btn btn-primary" disabled={busy || (reviewer && !replyTo)}>{busy ? 'Sending…' : 'Send Private Comment'}</button>
    </form>}
  </section>;
}
