import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { studentIterationsApi } from '../../../api/studentIterationsApi';
import { downloadFile } from '../../../api/downloadFile';
import { PrivateComments } from '../../../components/groups/PrivateComments';
import { DeadlineInfo } from '../../../components/ui/DeadlineInfo';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { useLiveRefresh } from '../../../hooks/useLiveRefresh';

export const IterationDetailPage = () => {
  const { id } = useParams(); const navigate = useNavigate();
  const [task, setTask] = useState(null); const [loading, setLoading] = useState(true);
  const [file, setFile] = useState(null); const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [now, setNow] = useState(() => Date.now()); const controller = useRef(null);
  const load = useCallback(async () => {
    try { const result = await studentIterationsApi.getById(id); setTask(result.data); setError(''); }
    catch (err) { setError(err.response?.data?.message || 'Milestone could not be loaded. Please retry.'); }
    finally { setLoading(false); }
  }, [id]);
  useEffect(() => { load(); const timer = setInterval(() => setNow(Date.now()), 1000); return () => { clearInterval(timer); controller.current?.abort(); }; }, [load]);
  useLiveRefresh(load);
  const submit = async (event) => {
    event.preventDefault(); if (!file) return; setBusy(true); setError(''); setNotice('');
    controller.current = new AbortController();
    const body = new FormData(); body.append('file', file); body.append('note', note);
    if (task.submission) body.append('expected_submission', task.submission.id || task.submission._id);
    let submitError = "";
    try {
      await studentIterationsApi.submit(id, body, controller.current.signal); setFile(null); setNotice('Group work submitted. All members share this submission.');
    } catch (err) { submitError = err.code === 'ERR_CANCELED' ? 'Upload stopped in this browser. Checking the server; a received submission must be unsubmitted separately.' : err.response?.data?.message || 'Submission was not confirmed. Refresh before retrying.'; }
    finally { setBusy(false); controller.current = null; await load(); if (submitError) setError(submitError); }
  };
  const unsubmit = async () => {
    if (!window.confirm('Unsubmit this shared group submission? Every member will see it as not submitted.')) return;
    setBusy(true);
    try { await studentIterationsApi.unsubmit(id, task.submission.id || task.submission._id); setNotice('Group work unsubmitted.'); await load(); }
    catch (err) { setError(err.response?.data?.message || 'Unsubmission was not confirmed. Refresh before retrying.'); }
    finally { setBusy(false); }
  };
  const download = async (url, name) => { try { await downloadFile(url, name); } catch (err) { setError(err.response?.data?.message || 'File could not be downloaded.'); } };
  if (loading) return <ContentLoader label="Loading milestone…" />;
  const beforeDeadline = task && now < new Date(task.deadline).getTime();
  const submission = task?.submission; const grade = task?.grade || task?.student_evaluation;
  const rubrics = grade?.rubric_snapshot || task?.rubrics || [];
  return <main className="page-frame-container">
    <button className="btn btn-back" onClick={() => navigate('/student/iterations')}><ArrowLeft size={18} />Back to Milestones</button>
    {error && <p role="alert" className="workflow-error">{error} <button className="btn btn-secondary btn-sm" onClick={load}>Refresh</button></p>}
    {notice && <p role="status">{notice}</p>}
    {task && <div className="classroom-grid"><div>
      <section className="workflow-card"><h1>{task.title}</h1>{task.deadline_invalid && <p role="alert">The deadline needs Manager correction. Submission controls are unavailable.</p>}<p>{task.course} · {task.sprint_name}</p><DeadlineInfo value={task.deadline} /><p className="preserve-lines">{task.details || 'No additional instructions.'}</p>
        {task.document_url && <button className="btn btn-secondary" onClick={() => download(task.document_url, task.document_name)}>Download Instructions</button>}
        <p>Late penalty: {submission?.late_penalty_percent ?? task.late_penalty_percent ?? 0}% of earned marks.</p>
      </section>
      <section className="workflow-card"><h3>Evaluation Rubric</h3>{!rubrics.length ? <p>Rubric not configured. Grading is unavailable.</p> : rubrics.map((r) => <article key={r.id}><h4>{r.question} · {r.weight} marks</h4><ul>{Object.entries(r.levels || {}).map(([score, description]) => <li key={score}>{score}: {description}</li>)}</ul></article>)}
        {grade && <div><h3>Group Performance</h3><p>Raw marks: {grade.raw_score ?? grade.total_weighted_score} · Deduction: {grade.deduction || 0} · Final: {grade.final_score ?? grade.total_weighted_score}/{grade.max_possible_score}</p><p className="preserve-lines">{grade.feedback}</p></div>}
      </section>
      <PrivateComments taskId={id} recipients={task.comment_recipients || []} />
    </div><aside className="workflow-card" style={{ alignSelf: 'start' }}>
      <h3>Your Group's Work</h3><p>{grade ? 'Graded and locked' : submission ? submission.is_late ? 'Submitted late' : 'Submitted on time' : beforeDeadline ? 'Not submitted' : 'Not submitted — late'}</p>
      {task.group_status !== 'approved' && <p>All members can view this milestone. Manager approval is required before submission.</p>}
      {submission && <><p>Submitted by {submission.submitted_by_name}</p><button className="btn btn-secondary" onClick={() => download(submission.file_url, submission.file_name)}>{submission.file_name}</button><p>{submission.note}</p></>}
      {submission && task.can_unsubmit && beforeDeadline && <button className="btn btn-secondary" disabled={busy} onClick={unsubmit}>Unsubmit Group Work</button>}
      {task.can_submit && !task.deadline_invalid && task.group_status === 'approved' && (!submission || beforeDeadline) && <form onSubmit={submit} className="workflow-form">
        <label>{submission ? 'Replace Group File' : 'Submission File'}<input type="file" required accept=".pdf,.docx,.xlsx,.zip" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] || null)} /></label>
        <label>Submission Note<textarea value={note} disabled={busy} onChange={(e) => setNote(e.target.value)} maxLength={20000} /></label>
        {busy ? <button type="button" className="btn btn-secondary" onClick={() => controller.current?.abort()}>Cancel Upload</button> : <button className="btn btn-primary" disabled={!file}>{beforeDeadline ? 'Submit Group Work' : 'Submit Late with Penalty'}</button>}
      </form>}
      {submission && !beforeDeadline && <p>The deadline has passed. This submission cannot be changed or removed.</p>}
    </aside></div>}
  </main>;
};
