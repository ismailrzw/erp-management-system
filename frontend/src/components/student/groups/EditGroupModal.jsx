import { useState, useEffect } from 'react';
import { Edit2, Loader2, AlertCircle, Info } from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { Modal } from '../../ui/Modal';

export const EditGroupModal = ({
  isOpen,
  onClose,
  group,
  onSuccess,
  mode = 'all', // 'name' | 'all'
}) => {
  const [formData, setFormData] = useState({ name: '', project_title: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isNameOnly = mode === 'name';
  const isRejected = group?.status === 'rejected';

  useEffect(() => {
    if (isOpen && group) {
      setFormData({
        name: group.name || '',
        project_title: group.project_title || '',
      });
      setError('');
    }
  }, [isOpen, group]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const project_title = formData.project_title.trim();

    if (!name || name.length < 3) {
      setError('Group name must be at least 3 characters.');
      return;
    }
    if (name.length > 100) {
      setError('Group name cannot exceed 100 characters.');
      return;
    }

    if (!isNameOnly) {
      if (!project_title || project_title.length < 5) {
        setError('Project title must be at least 5 characters.');
        return;
      }
      if (project_title.length > 200) {
        setError('Project title cannot exceed 200 characters.');
        return;
      }
    }

    const payload = isNameOnly
      ? { name }
      : { name, project_title };

    try {
      setLoading(true);
      setError('');
      const groupId = group.id || group._id;
      const res = await studentGroupApi.updateGroup(groupId, payload);
      if (res.success) {
        if (onSuccess) onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isNameOnly ? 'Change Group Name' : 'Edit Group Proposal'}
      maxWidth="500px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {error && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {isRejected && (
          <div
            style={{
              padding: '10px 12px',
              backgroundColor: '#fef3c7',
              border: '1px solid #fde68a',
              borderRadius: '6px',
              color: '#92400e',
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '8px',
              lineHeight: 1.4,
            }}
          >
            <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <b>Revision Note:</b> Saving these changes will automatically reset the group proposal status to <b>Pending</b> and resubmit it to your PBL Manager for review.
            </div>
          </div>
        )}

        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Group Name *
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="e.g. Alpha Tech, Sigma Squad"
            required
            maxLength={100}
            style={{
              width: '100%',
              padding: '8px 12px',
              fontSize: '13.5px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              outline: 'none',
              boxSizing: 'border-box',
            }}
          />
          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
            Must be 3–100 characters. Visible to course peers and managers.
          </div>
        </div>

        {!isNameOnly && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Project Title *
            </label>
            <textarea
              value={formData.project_title}
              onChange={(e) => setFormData({ ...formData, project_title: e.target.value })}
              placeholder="Brief, descriptive title for your project proposal..."
              required
              rows={3}
              maxLength={200}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Must be 5–200 characters. Outlines your project concept.
            </div>
          </div>
        )}

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '10px',
            paddingTop: '12px',
            borderTop: '1px solid #e2e8f0',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#475569',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? <Loader2 size={15} className="animate-spin" /> : <Edit2 size={15} />}
            <span>{loading ? 'Saving...' : isRejected ? 'Save & Resubmit' : 'Save Changes'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
