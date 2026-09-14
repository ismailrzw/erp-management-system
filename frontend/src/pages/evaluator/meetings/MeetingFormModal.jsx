import { useState } from 'react';
import { X, Calendar, AlertCircle } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';

export function MeetingFormModal({ defaultGroupId = '', assignedGroups = [], onClose, onSuccess }) {
  const [groupId, setGroupId] = useState(defaultGroupId);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [agenda, setAgenda] = useState('');
  const [minutes, setMinutes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    if (!groupId) {
      setError('Please select a group.');
      return;
    }
    if (!title.trim()) {
      setError('Please enter a meeting title.');
      return;
    }
    if (!date) {
      setError('Please select a date.');
      return;
    }

    setSaving(true);
    setError('');

    try {
      await evaluatorApi.logMeeting({
        group_id: groupId,
        title: title.trim(),
        date,
        agenda: agenda.trim(),
        minutes: minutes.trim(),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to log meeting.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px',
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '520px',
        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
        }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
            Log Supervision Meeting
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Select Group */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Project Group *
            </label>
            <select
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              disabled={!!defaultGroupId}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                background: defaultGroupId ? '#f1f5f9' : '#ffffff',
              }}
            >
              <option value="">Select Group...</option>
              {assignedGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name} ({g.course})</option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Meeting Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. SRS Review & Guidance"
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Date */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Meeting Date *
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Agenda */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Agenda (optional)
            </label>
            <textarea
              rows={2}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
              placeholder="Key topics discussed..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Minutes */}
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Minutes / Guidance Provided (optional)
            </label>
            <textarea
              rows={3}
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              placeholder="Action items or recommendations for the group..."
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                boxSizing: 'border-box',
                resize: 'vertical',
              }}
            />
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: '#dc2626',
              fontSize: '13px',
              marginBottom: '16px',
            }}>
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                color: '#475569',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '8px 18px',
                borderRadius: '6px',
                border: 'none',
                background: saving ? '#93c5fd' : '#2563eb',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: saving ? 'not-allowed' : 'pointer',
              }}
            >
              {saving ? 'Saving...' : 'Save Meeting Log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
