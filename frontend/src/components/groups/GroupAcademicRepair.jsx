import { useEffect, useState } from 'react';
import api from '../../api/client';

export function GroupAcademicRepair({ group, onSaved }) {
  const [courses, setCourses] = useState([]); const [course, setCourse] = useState('');
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false);
  const load = async () => {
    try { const result = await api.get('/manager/courses/'); setCourses(result.data.data.items || []); setError(''); }
    catch { setError('Active Courses could not be loaded.'); }
  };
  useEffect(() => { load(); }, []);
  const save = async event => {
    event.preventDefault(); if (!window.confirm('Confirm this verified association? Every member must already have the same Course and Department.')) return;
    setBusy(true);
    try { await api.post(`/manager/groups/${group.id}/academic-link`, { course_id: course, expected_version: group.version || 1 }); await onSaved(); }
    catch (err) { setError(err.response?.data?.message || 'Correction was not confirmed. Refresh before retrying.'); }
    finally { setBusy(false); }
  };
  return <section className="workflow-card"><h3>Verify Legacy Academic Association</h3><p>Correct an incomplete group link using its members' existing enrollment. This preserves identities, membership and grades.</p>{error && <p role="alert">{error} <button className="btn btn-secondary btn-sm" onClick={load}>Reload Courses</button></p>}<form className="workflow-form" onSubmit={save}><label>Verified Course<select required value={course} onChange={event => setCourse(event.target.value)} disabled={busy}><option value="">Select Course</option>{courses.map(item => <option key={item.id} value={item.id}>{item.name} ({item.dept})</option>)}</select></label><button className="btn btn-secondary" disabled={busy || !course}>{busy ? 'Verifying…' : 'Verify and Restore Association'}</button></form></section>;
}
