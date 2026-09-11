import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { Select } from '../../../components/ui/Select';
import { DateTimePicker } from '../../../components/ui/DateTimePicker';
import { iterationsApi } from '../../../api/iterationsApi';
import { rubricTemplatesApi } from '../../../api/rubricTemplatesApi';
import { FileText, GraduationCap } from 'lucide-react';

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
    rubric_template_id: '',
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
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
        rubric_template_id: currentIteration.rubric_template_id || '',
      });
    } else {
      // BUG FIX: default course to '' so manager must explicitly choose
      setFormData({
        title: '',
        course: '',
        deadline: '',
        details: '',
        rubric_template_id: '',
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
      const payload = { ...formData };
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
