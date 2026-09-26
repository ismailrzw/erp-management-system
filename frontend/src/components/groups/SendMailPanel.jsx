import { useState } from 'react';
import { Mail, Send, Loader2, Users, UserX, CheckSquare, X } from 'lucide-react';
import { managerGroupsApi } from '../../api/managerGroupsApi';

export const SendMailPanel = ({ groups = [], onClose, onSuccess, onError }) => {
  const [target, setTarget] = useState('all_groups'); // 'all_groups' | 'specific_groups' | 'ungrouped'
  const [selectedGroupIds, setSelectedGroupIds] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleToggleGroup = (groupId) => {
    setSelectedGroupIds((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  const handleSelectAll = () => {
    if (selectedGroupIds.length === groups.length) {
      setSelectedGroupIds([]);
    } else {
      setSelectedGroupIds(groups.map((g) => g.id));
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!subject.trim()) {
      if (onError) onError('Email subject is required.');
      return;
    }
    if (!body.trim()) {
      if (onError) onError('Email message body is required.');
      return;
    }
    if (target === 'specific_groups' && selectedGroupIds.length === 0) {
      if (onError) onError('Please select at least one group to send email to.');
      return;
    }

    try {
      setIsSending(true);
      const payload = {
        target,
        subject: subject.trim(),
        body: body.trim(),
        group_ids: target === 'specific_groups' ? selectedGroupIds : undefined,
      };
      const res = await managerGroupsApi.sendMail(payload);
      if (res.success) {
        if (onSuccess) onSuccess(res.message || 'Emails sent successfully!');
        if (onClose) onClose();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to dispatch emails';
      if (onError) onError(msg);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #cbd5e1',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        padding: '24px',
        marginBottom: '22px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '14px',
          marginBottom: '18px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: '#eaf5fb',
              color: '#0073aa',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Mail size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              Broadcast Email to Project Teams
            </h3>
            <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
              Send targeted reminders, deadlines, and project announcements to enrolled students.
            </div>
          </div>
        </div>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'transparent',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      <form onSubmit={handleSend}>
        {/* Target Audience Selector */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
            Select Target Audience *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
            <div
              onClick={() => setTarget('all_groups')}
              style={{
                border: target === 'all_groups' ? '2px solid #0073aa' : '1px solid #cbd5e1',
                backgroundColor: target === 'all_groups' ? '#eaf5fb' : '#ffffff',
                borderRadius: '6px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <Users size={16} color={target === 'all_groups' ? '#0073aa' : '#64748b'} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>All Formed Groups</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Members of all active groups</div>
              </div>
            </div>

            <div
              onClick={() => setTarget('specific_groups')}
              style={{
                border: target === 'specific_groups' ? '2px solid #0073aa' : '1px solid #cbd5e1',
                backgroundColor: target === 'specific_groups' ? '#eaf5fb' : '#ffffff',
                borderRadius: '6px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckSquare size={16} color={target === 'specific_groups' ? '#0073aa' : '#64748b'} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Specific Groups</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Pick groups from list</div>
              </div>
            </div>

            <div
              onClick={() => setTarget('ungrouped')}
              style={{
                border: target === 'ungrouped' ? '2px solid #d97706' : '1px solid #cbd5e1',
                backgroundColor: target === 'ungrouped' ? '#fef3c7' : '#ffffff',
                borderRadius: '6px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <UserX size={16} color={target === 'ungrouped' ? '#d97706' : '#64748b'} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>Ungrouped Students</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>Students without a team</div>
              </div>
            </div>
          </div>
        </div>

        {/* Specific Groups Selector if chosen */}
        {target === 'specific_groups' && (
          <div
            style={{
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              padding: '12px 14px',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>
                Select Groups ({selectedGroupIds.length} of {groups.length} selected):
              </span>
              <button
                type="button"
                onClick={handleSelectAll}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: '#0073aa',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                {selectedGroupIds.length === groups.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', maxHeight: '140px', overflowY: 'auto' }}>
              {groups.map((g) => {
                const isSelected = selectedGroupIds.includes(g.id);
                return (
                  <label
                    key={g.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '5px 10px',
                      borderRadius: '4px',
                      backgroundColor: isSelected ? '#0073aa' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: isSelected ? '1px solid #0073aa' : '1px solid #cbd5e1',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      userSelect: 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleGroup(g.id)}
                      style={{ display: 'none' }}
                    />
                    <span>{g.name}</span>
                    <span style={{ opacity: 0.8, fontSize: '11px' }}>({g.course_name || g.course})</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Email Subject */}
        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Email Subject *
          </label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="e.g. Important Update: Sprint 1 Deliverables & Rubrics Deadline"
            required
            style={{
              width: '100%',
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13.5px',
              outline: 'none',
            }}
          />
        </div>

        {/* Email Body */}
        <div style={{ marginBottom: '18px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Email Message Content *
          </label>
          <textarea
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write your email announcement or reminder message here. Students will receive this notification directly in their inbox..."
            required
            style={{
              width: '100%',
              padding: '10px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13.5px',
              outline: 'none',
              resize: 'vertical',
              fontFamily: 'inherit',
            }}
          />
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            disabled={isSending}
            className="btn btn-primary"
          >
            {isSending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            <span>{isSending ? 'Sending Emails...' : 'Send Broadcast Email'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
