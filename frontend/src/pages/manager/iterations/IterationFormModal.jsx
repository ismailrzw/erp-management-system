import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { DateTimePicker } from '../../../components/ui/DateTimePicker';
import { iterationsApi } from '../../../api/iterationsApi';
import { rubricTemplatesApi } from '../../../api/rubricTemplatesApi';
import { attachmentsApi } from '../../../api/attachmentsApi';
import { FileText, GraduationCap, Paperclip, Upload, X } from 'lucide-react';

export const IterationFormModal = ({
  isOpen,
  onClose,
  iteration = null,
  initialData = null,
  courses = [],
  onSave,
  onSuccess,
}) => {
  const currentIteration = iteration || initialData;

  const [formData, setFormData] = useState({
    title: '',
    course: '',
    deadline: '',
    details: '',
    document_url: '',
    document_name: '',
    rubric_template_id: '',
    is_group_formation: false,
    late_penalty_percent: 10,
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    // Fetch rubric templates for the dropdown
    rubricTemplatesApi.getAll().then((res) => {
      setTemplates(res.data || []);
    }).catch(() => setTemplates([]));
  }, [isOpen]);

  useEffect(() => {
    if (currentIteration) {
      setFormData({
        title: currentIteration.title || '',
        course: currentIteration.course || '',
        deadline: currentIteration.deadline || '',
        details: currentIteration.details || '',
        document_url: currentIteration.document_url || '',
        document_name: currentIteration.document_name || '',
        rubric_template_id: currentIteration.rubric_template_id || '',
        is_group_formation: !!currentIteration.is_group_formation,
        late_penalty_percent: currentIteration.late_penalty_percent !== undefined ? currentIteration.late_penalty_percent : 10,
      });
    } else {
      // BUG FIX: default course to '' so manager must explicitly choose
      setFormData({
        title: '',
        course: '',
        deadline: '',
        details: '',
        document_url: '',
        document_name: '',
        rubric_template_id: '',
        is_group_formation: false,
        late_penalty_percent: 10,
      });
    }
    setError('');
  }, [currentIteration, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.course || !formData.deadline) {
      setError('Title, course, and deadline are required fields.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        ...formData,
        is_group_formation: Boolean(formData.is_group_formation),
        late_penalty_percent: Number(formData.late_penalty_percent) || 0,
      };
      // Only send rubric_template_id if selected and creating new
      if (!payload.rubric_template_id) {
        delete payload.rubric_template_id;
      }
      if (currentIteration) {
        delete payload.rubric_template_id; // Don't change template on edit
        await iterationsApi.update(currentIteration._id, payload);
      } else {
        await iterationsApi.create(payload);
      }

      const callback = onSave || onSuccess;
      if (typeof callback === 'function') {
        callback();
      }
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save iteration.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Filter templates relevant to the selected course or "All Courses"
  const relevantTemplates = templates.filter(
    (t) => t.course === 'All Courses' || t.course === formData.course || !formData.course
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={currentIteration ? 'Edit Iteration Milestone' : 'Add Iteration Milestone'}>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
            {error}
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Title <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="text"
            placeholder="e.g. Project Proposal Submission"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            required
          />
        </div>

        <div>
          <Select
            label="Target Course"
            required
            icon={GraduationCap}
            value={formData.course}
            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
          >
            <option value="">— Select Course —</option>
            <option value="All Courses" style={{ fontWeight: 600, color: '#7c3aed' }}>
              🌐 All Courses (Cross-Section)
            </option>
            {courses.map((c) => (
              <option key={c._id || c.id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <DateTimePicker
            label="Submission Deadline"
            required
            value={formData.deadline}
            onChange={(val) => setFormData({ ...formData, deadline: val })}
            helperText="Set exact date & time for the milestone submission deadline."
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Details & Instructions
          </label>
          <textarea
            rows={3}
            placeholder="Instructions for students regarding deliverables..."
            value={formData.details}
            onChange={(e) => setFormData({ ...formData, details: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '13.5px', resize: 'vertical' }}
          />
        </div>

        {/* Attachment / Resource Document for Students */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Attach Document / Guidelines for Students (Optional)
          </label>
          {formData.document_url ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', backgroundColor: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontWeight: 500 }}>
                <Paperclip size={15} style={{ color: '#2563eb' }} />
                <span>{formData.document_name || 'Attached Document'}</span>
              </div>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, document_url: '', document_name: '' })}
                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '2px', fontSize: '12px', fontWeight: 500 }}
              >
                <X size={14} /> Remove
              </button>
            </div>
          ) : (
            <div>
              <input
                type="file"
                id="iteration-doc-upload"
                style={{ display: 'none' }}
                accept=".pdf,.docx,.xlsx,.zip"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setUploadingDoc(true);
                  try {
                    const uploadData = new FormData();
                    uploadData.append('file', file);
                    uploadData.append('title', file.name);
                    const res = await attachmentsApi.upload(uploadData);
                    const att = res.data || res;
                    setFormData({
                      ...formData,
                      document_name: file.name,
                      document_url: att.url || `/api/manager/attachments/${att.id || att._id}/download`,
                    });
                  } catch (err) {
                    setError(err.response?.data?.message || 'Failed to upload document.');
                  } finally {
                    setUploadingDoc(false);
                  }
                }}
              />
              <label
                htmlFor="iteration-doc-upload"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: '1px dashed #cbd5e1',
                  backgroundColor: '#f8fafc',
                  color: '#475569',
                  fontSize: '13px',
                  fontWeight: 500,
                  cursor: uploadingDoc ? 'not-allowed' : 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Upload size={15} style={{ color: '#2563eb' }} />
                <span>{uploadingDoc ? 'Uploading document...' : 'Click to attach PDF, DOCX, XLSX, or ZIP document for students'}</span>
              </label>
            </div>
          )}
        </div>

        {/* Rubric Template Selector (only for creation) */}
        {!initialData && (
          <div>
            <Select
              label="Link Rubric Template (Optional)"
              icon={FileText}
              value={formData.rubric_template_id}
              onChange={(e) => setFormData({ ...formData, rubric_template_id: e.target.value })}
              helperText="Pre-populates rubric criteria from a saved template. You can customize them later."
            >
              <option value="">— No Template (Add Rubrics Later) —</option>
              {relevantTemplates.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.criteria?.length || 0} criteria) — {t.course}
                </option>
              ))}
            </Select>
          </div>
        )}

        {/* Group Formation & Late Penalty Configuration */}
        <div
          style={{
            padding: '12px 14px',
            backgroundColor: formData.is_group_formation ? '#f0fdf4' : '#f8fafc',
            border: `1px solid ${formData.is_group_formation ? '#bbf7d0' : '#e2e8f0'}`,
            borderRadius: '8px',
            transition: 'all 0.15s ease',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
            <input
              type="checkbox"
              id="is_group_formation"
              checked={formData.is_group_formation}
              onChange={(e) => setFormData({ ...formData, is_group_formation: e.target.checked })}
              style={{ marginTop: '3px', cursor: 'pointer', accentColor: '#16a34a' }}
            />
            <div style={{ flex: 1 }}>
              <label
                htmlFor="is_group_formation"
                style={{
                  display: 'block',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  color: formData.is_group_formation ? '#166534' : '#334155',
                  cursor: 'pointer',
                }}
              >
                Designate as Group Formation & Proposal Cutoff
              </label>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                Establishes this milestone deadline as the official group formation cutoff for students enrolled in this course. Groups formed after this date will be tracked and penalized.
              </p>
            </div>
          </div>

          {formData.is_group_formation && (
            <div style={{ marginTop: '12px', paddingLeft: '24px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '12.5px', fontWeight: 600, color: '#166534' }}>
                Late Group Formation Penalty (%):
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={formData.late_penalty_percent}
                onChange={(e) => setFormData({ ...formData, late_penalty_percent: e.target.value })}
                style={{
                  width: '80px',
                  padding: '5px 8px',
                  borderRadius: '6px',
                  border: '1px solid #86efac',
                  fontSize: '13px',
                  backgroundColor: '#ffffff',
                  color: '#166534',
                  fontWeight: 700,
                }}
              />
              <span style={{ fontSize: '11.5px', color: '#15803d' }}>
                Deducted automatically from milestone rubric score
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', backgroundColor: '#2563eb', color: '#ffffff', fontSize: '13px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
          >
            {loading ? 'Saving...' : initialData ? 'Update Iteration' : 'Create Iteration'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
