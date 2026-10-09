import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/useAuth';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { BackButton } from '../components/ui/BackButton';

const plainText = (value) => new DOMParser().parseFromString(value || '', 'text/html').body.textContent || '';
export function AnnouncementsPage() {
  const { user } = useAuth(); const [params] = useSearchParams();
  const [page, setPage] = useState(1); const [data, setData] = useState({ items: [], total: 0, unread_count: 0 });
  const [error, setError] = useState(''); const [expanded, setExpanded] = useState(params.get('announcement'));
  const load = useCallback(async () => {
    try { const result = await api.get('/notifications', { params: { page, limit: 20 } }); setData(result.data.data); setError(''); }
    catch { setError('History could not be loaded. Please retry.'); }
  }, [page]);
  useEffect(() => { load(); }, [load]); useLiveRefresh(load);
  useEffect(() => {
    const id = params.get('announcement');
    if (!id) return;
    api.post(`/notifications/${id}/read`).then(() => { window.dispatchEvent(new Event('announcements-read')); return load(); }).catch(() => setError('The read state could not be saved. Use Mark Read to retry.'));
  }, [params, load]);
  const read = async (id) => {
    setExpanded(id);
    try { await api.post(`/notifications/${id}/read`); window.dispatchEvent(new Event('announcements-read')); await load(); }
    catch { setError('The read state could not be saved. Retry to mark this announcement read.'); }
  };
  const prefix = { pbl_manager: 'manager', teacher: 'teacher', evaluator: 'evaluator', student: 'student' }[user?.role];
  return <main className="page-frame-container">
    <BackButton to={prefix ? `/${prefix}/dashboard` : '/'} label="Back to Dashboard" />
    <h1>Announcement History</h1><p>{data.unread_count} unread announcements</p>
    {error && <p role="alert" className="workflow-error">{error} <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button></p>}
    {!data.items.length && !error && <section className="workflow-card">No announcements yet.</section>}
    {data.items.map((item) => <article className={`workflow-card ${item.is_read ? '' : 'announcement-unread'}`} key={item.id}>
      <button className="announcement-heading" onClick={() => read(item.id)} aria-expanded={expanded === item.id}><strong>{!item.is_read && '● '}{item.title}</strong><span>{item.is_read ? 'Read' : 'Unread'}</span></button>
      <small>{new Date(item.created_at || item.date).toLocaleString()}</small>
      {expanded === item.id && <div className="preserve-lines">{plainText(item.content)} {!item.is_read && <button className="btn btn-secondary btn-sm" onClick={() => read(item.id)}>Mark Read</button>}</div>}
    </article>)}
    <div className="workflow-actions"><button className="btn btn-secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page}</span><button className="btn btn-secondary" disabled={page * 20 >= data.total} onClick={() => setPage(page + 1)}>Next</button></div>
  </main>;
}
