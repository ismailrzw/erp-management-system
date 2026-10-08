import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { iterationsApi } from '../../../api/iterationsApi';
import { rubricTemplatesApi } from '../../../api/rubricTemplatesApi';
import { attachmentsApi } from '../../../api/attachmentsApi';

function localInput(value) {
  if (!value) return '';
  if (value.length === 10) return value + 'T23:59';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export const IterationFormModal = ({ isOpen, onClose, iteration = null, initialData = null, courses = [], onSave, onSuccess }) => {
  const current = iteration || initialData;
  const editing = Boolean(current?._id || current?.id);
  const [form, setForm] = useState({}); const [templates, setTemplates] = useState([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => {
    if (!isOpen) return;
    setForm({ title: current?.title || '', course: current?.course || 'All Courses', deadline: localInput(current?.deadline), details: current?.details || '', late_penalty_percent: current?.late_penalty_percent || 0, rubric_template_id: current?.rubric_template_id || '', document_url: current?.document_url || '', document_name: current?.document_name || '', document_attachment_id: current?.document_attachment_id || '', file: null });
    setError('');
    rubricTemplatesApi.getAll().then((r) => setTemplates(r.data || [])).catch(() => setError('Rubric templates could not be loaded. Retry opening this editor.'));
  }, [isOpen, current]);
  const set = (key, value) => setForm((previous) => ({ ...previous, [key]: value }));
  const save = async (event) => {
    event.preventDefault(); setBusy(true); setError('');
    try {
      const body = { title: form.title.trim(), course: form.course, deadline: new Date(form.deadline).toISOString(), details: form.details.trim(), late_penalty_percent: Number(form.late_penalty_percent), document_url: form.document_url, document_name: form.document_name };
      if (form.file) {
        const upload = new FormData(); upload.append('file', form.file); upload.append('title', 'Milestone Instructions'); upload.append('purpose', 'milestone');
        const result = await attachmentsApi.upload(upload);
        body.document_attachment_id = result.data.id;
        // Keep a successfully uploaded file available when saving the task fails.
        set('document_attachment_id', result.data.id); set('file', null); set('document_name', result.data.original_filename);
      } else if (form.document_attachment_id) body.document_attachment_id = form.document_attachment_id;
      if (form.rubric_template_id && (!editing || form.rubric_template_id !== current.rubric_template_id)) body.rubric_template_id = form.rubric_template_id;
      if (editing) {
        body.expected_version = current.version || 1;
        await iterationsApi.update(current._id || current.id, body);
      } else {
        body.sprint_id = current?.sprint_id; body.sprint_name = current?.sprint_name;
        await iterationsApi.create(body);
      }
      (onSave || onSuccess)?.(); onClose();
    } catch (err) { setError(err.response?.data?.message || err.message || 'Milestone could not be saved. Your form is preserved.'); }
    finally { setBusy(false); }
  };
  return <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={editing ? 'Edit Milestone' : 'Add Milestone'} maxWidth="680px">
    <form className="workflow-form" onSubmit={save}>
      {error && <p role="alert" className="workflow-error">{error}</p>}
      <label>Milestone Title<input required maxLength={200} value={form.title || ''} onChange={(e) => set('title', e.target.value)} disabled={busy} /></label>
      <label>Target Course<select value={form.course || 'All Courses'} onChange={(e) => set('course', e.target.value)} disabled={busy}><option>All Courses</option>{courses.map((c) => <option key={c.id || c._id || c.name} value={c.name}>{c.name} ({c.dept})</option>)}</select></label>
      <label>Submission Deadline<input type="datetime-local" required value={form.deadline || ''} onChange={(e) => set('deadline', e.target.value)} disabled={busy} /></label>
      <label>Details and Instructions<textarea rows={5} value={form.details || ''} onChange={(e) => set('details', e.target.value)} disabled={busy} /></label>
      <label>Attached Document<input type="file" accept=".pdf,.docx,.xlsx,.zip" onChange={(e) => set('file', e.target.files?.[0] || null)} disabled={busy} /></label>
      {form.document_name && <p>Attached: {form.document_name}</p>}
      <label>Rubric<select value={form.rubric_template_id || ''} onChange={(e) => set('rubric_template_id', e.target.value)} disabled={busy}><option value="">No rubric selected</option>{templates.filter((t) => !t.course || t.course === 'All Courses' || t.course === form.course).map((t) => <option key={t._id || t.id} value={t._id || t.id}>{t.name}</option>)}</select></label>
      <p>A milestone without a rubric remains visible, but grading is unavailable until its rubric is configured.</p>
      <label>Late Submission Penalty (% of earned marks)<input type="number" min={0} max={100} step={1} value={form.late_penalty_percent ?? 0} onChange={(e) => set('late_penalty_percent', e.target.value)} disabled={busy} /></label>
      <div className="workflow-actions"><button type="button" className="btn btn-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save Milestone'}</button></div>
    </form>
  </Modal>;
};
