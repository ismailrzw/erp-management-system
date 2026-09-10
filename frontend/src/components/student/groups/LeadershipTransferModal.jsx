import { useState, useEffect } from 'react';
import { Crown, LogOut, Loader2, AlertCircle, Trash2 } from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { Modal } from '../../ui/Modal';

export const LeadershipTransferModal = ({
  isOpen,
  onClose,
  group,
  currentUserId,
  onSuccess,
}) => {
  const [selectedSuccessorId, setSelectedSuccessorId] = useState('');
  const [leaving, setLeaving] = useState(false);
  const [leaveError, setLeaveError] = useState('');

  const members = group?.members || [];
  const otherMembers = members.filter((m) => m.id !== currentUserId);
  const isLeader = group?.is_leader;
  const isSoleMember = members.length <= 1;

  useEffect(() => {
    if (isOpen) {
      const others = (group?.members || []).filter((m) => m.id !== currentUserId);
      setSelectedSuccessorId(others.length > 0 ? others[0].id : '');
      setLeaveError('');
    }
  }, [isOpen, group, currentUserId]);

  const handleConfirmLeave = async () => {
    try {
      setLeaving(true);
      setLeaveError('');

      // If leader and other members exist, transfer leadership first
      if (isLeader && !isSoleMember) {
        if (!selectedSuccessorId) {
          setLeaveError('Please select a new group leader before leaving.');
          setLeaving(false);
          return;
        }

        const transferRes = await studentGroupApi.transferLeadership(group.id, selectedSuccessorId);
        if (!transferRes.success) {
          setLeaveError(transferRes.message || 'Failed to transfer leadership.');
          setLeaving(false);
          return;
        }
      }

      // Execute departure
      const leaveRes = await studentGroupApi.leaveGroup(group.id);
      if (leaveRes.success) {
        onSuccess(
          isLeader && isSoleMember
            ? 'Group has been disbanded and deleted.'
            : 'You have left the group and transferred leadership.'
        );
        onClose();
      }
    } catch (err) {
      setLeaveError(err.response?.data?.message || 'Failed to leave group.');
    } finally {
      setLeaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isLeader && !isSoleMember ? 'Designate New Leader & Leave Group' : 'Confirm Departure from Group'}
      maxWidth="500px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {leaveError && (
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
            <span>{leaveError}</span>
          </div>
        )}

        {isLeader && !isSoleMember ? (
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px 14px',
                backgroundColor: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '6px',
                fontSize: '13px',
                color: '#92400e',
                marginBottom: '14px',
              }}
            >
              <Crown size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#d97706' }} />
              <div>
                As the <b>Group Leader</b>, you must designate an active member to become the new leader before you can leave.
              </div>
            </div>

            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Select Successor Leader:
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '200px', overflowY: 'auto' }}>
              {otherMembers.map((m) => (
                <label
                  key={m.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    backgroundColor: selectedSuccessorId === m.id ? '#f0f9ff' : '#ffffff',
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="radio"
                    name="successorLeader"
                    value={m.id}
                    checked={selectedSuccessorId === m.id}
                    onChange={() => setSelectedSuccessorId(m.id)}
                    style={{ cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{m.name}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>
                      Roll: <b>{m.roll}</b> • Sec {m.section || 'N/A'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : isLeader && isSoleMember ? (
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#b91c1c',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                You are the only member in this group. Leaving will permanently <b>disband and delete</b> this project group and cancel any pending invitations.
              </div>
            </div>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155' }}>
            Are you sure you want to leave <b>{group?.name}</b>? You will need to be re-invited or join another group.
          </p>
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
            type="button"
            onClick={handleConfirmLeave}
            disabled={leaving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: leaving ? 'not-allowed' : 'pointer',
            }}
          >
            {leaving ? <Loader2 size={15} className="animate-spin" /> : isLeader && isSoleMember ? <Trash2 size={15} /> : <LogOut size={15} />}
            <span>{leaving ? 'Processing...' : isLeader && !isSoleMember ? 'Transfer & Leave' : isLeader && isSoleMember ? 'Disband Group' : 'Confirm Leave'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
