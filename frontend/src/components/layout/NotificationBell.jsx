import { useCallback, useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/client';
import { useAuth } from '../../context/useAuth';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

const announcementsPath = (role) => ({ pbl_manager: '/manager', student: '/student', teacher: '/teacher', evaluator: '/evaluator' }[role] || '') + '/announcements';
export function NotificationBell() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [open, setOpen] = useState(false); const [data, setData] = useState({ items: [], unread_count: 0 });
  const [error, setError] = useState(''); const wrapper = useRef(null);
  const refresh = useCallback(async () => {
    try { const result = await api.get('/notifications', { params: { limit: 6 } }); setData(result.data.data); setError(''); }
    catch { setError('Announcements could not be loaded.'); }
  }, []);
  useEffect(() => { refresh(); }, [refresh, user?.id]);
  useLiveRefresh(refresh);
  useEffect(() => { window.addEventListener('announcements-read', refresh); return () => window.removeEventListener('announcements-read', refresh); }, [refresh]);
  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape' || (event.type === 'mousedown' && !wrapper.current?.contains(event.target))) setOpen(false); };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, []);
  return <div ref={wrapper} className="notification-wrapper">
    <button className="notification-trigger" title="Announcements" aria-label={`Announcements, ${data.unread_count} unread`} aria-expanded={open} onClick={() => { setOpen(!open); refresh(); }}><Bell size={20} />{data.unread_count > 0 && <span className="notification-count">{data.unread_count > 99 ? '99+' : data.unread_count}</span>}</button>
    {open && <section className="notification-panel" aria-label="Recent announcements">
      <h3>Announcements</h3>
      {error ? <p role="alert">{error} <button className="btn btn-secondary btn-sm" onClick={refresh}>Retry</button></p> : !data.items.length ? <p>No announcements yet.</p> : data.items.map((item) => <button key={item.id} className={`notification-item ${item.is_read ? '' : 'unread'}`} onClick={() => { setOpen(false); navigate(`${announcementsPath(user?.role)}?announcement=${item.id}`); }}><strong>{!item.is_read && '● '}{item.title}</strong><small>{new Date(item.created_at || item.date).toLocaleString()}</small></button>)}
      <button className="btn btn-secondary" onClick={() => { setOpen(false); navigate(announcementsPath(user?.role)); }}>Show More</button>
    </section>}
  </div>;
}
