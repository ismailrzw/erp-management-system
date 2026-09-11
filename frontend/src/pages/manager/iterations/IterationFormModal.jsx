import { useState, useEffect } from 'react';
import { Modal } from '../../../components/ui/Modal';
import { iterationsApi } from '../../../api/iterationsApi';

export const IterationFormModal = ({ isOpen, onClose, initialData = null, courses = [], onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    course: '',
    deadline: '',
    details: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || '',
        course: initialData.course || '',
        deadline: initialData.deadline || '',
        details: initialData.details || '',
      });
    } else {
      setFormData({
        title: '',
        course: courses.length > 0 ? courses[0].name : '',
        deadline: '',
        details: '',
      });
    }
    setError('');
  }, [initialData, courses, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.title.trim() || !formData.course || !formData.deadline) {
      setError('Title, course, and deadline are required fields.');
      return;
    }

    setLoading(true);
    try {
      if (initialData) {
        await iterationsApi.update(initialData._id, formData);
      } else {
        await iterationsApi.create(formData);
      }
      onSave();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to save iteration.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={initialData ? 'Edit Iteration Milestone' : 'Add Iteration Milestone'}>
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
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Target Course <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <select
            value={formData.course}
            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            required
          >
            <option value="">Select Course</option>
            {courses.map((c) => (
              <option key={c._id || c.id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
            Submission Deadline <span style={{ color: '#dc2626' }}>*</span>
          </label>
          <input
            type="date"
            value={formData.deadline}
            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px' }}
            required
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
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13.5px', resize: 'vertical' }}
          />
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
