import { useState, useEffect } from 'react';
import { Search, Loader2, UserPlus, AlertCircle, X } from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { Modal } from '../../ui/Modal';

export const InviteModal = ({
  isOpen,
  onClose,
  group,
  onSuccess,
}) => {
  const [inviteRollQuery, setInviteRollQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedPeers, setSelectedPeers] = useState([]); // [{ id, name, roll, section }]
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const currentCount = group?.members?.length || group?.member_count || 1;
  const maxCapacity = group?.max_group || 4;
  const remainingSlots = Math.max(0, maxCapacity - currentCount);

  // Reset states on open/close
  useEffect(() => {
    if (isOpen) {
      setInviteRollQuery('');
      setSearchResults([]);
      setSelectedPeers([]);
      setInviteError('');
    }
  }, [isOpen]);

  // Peer Search on input change with 300ms debounce
  useEffect(() => {
    if (!inviteRollQuery.trim() || inviteRollQuery.trim().length < 1) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await studentGroupApi.searchStudents(inviteRollQuery.trim());
        if (res.success && res.data?.items) {
          setSearchResults(res.data.items);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inviteRollQuery]);

  const toggleSelectPeer = (peer) => {
    if (peer.has_group) return;
    const isSelected = selectedPeers.some((p) => p.id === peer.id);
    if (isSelected) {
      setSelectedPeers((prev) => prev.filter((p) => p.id !== peer.id));
      setInviteError('');
    } else {
      if (selectedPeers.length >= remainingSlots) {
        setInviteError(`You can only invite up to ${remainingSlots} more peer(s) based on group capacity.`);
        return;
      }
      setSelectedPeers((prev) => [...prev, peer]);
      setInviteError('');
    }
  };

  const removeSelectedPeer = (peerId) => {
    setSelectedPeers((prev) => prev.filter((p) => p.id !== peerId));
    setInviteError('');
  };

  const handleSendBatchInvitations = async () => {
    if (selectedPeers.length === 0) {
      setInviteError('Please select at least one student to invite.');
      return;
    }

    try {
      setInviting(true);
      setInviteError('');

      const results = await Promise.allSettled(
        selectedPeers.map((p) => studentGroupApi.inviteMember(group.id, p.roll))
      );

      const failures = [];
      let successCount = 0;

      results.forEach((r, idx) => {
        if (r.status === 'fulfilled' && r.value?.success) {
          successCount++;
        } else {
          const errMsg = r.reason?.response?.data?.message || r.value?.message || 'Failed';
          failures.push(`${selectedPeers[idx].name || selectedPeers[idx].roll}: ${errMsg}`);
        }
      });

      if (successCount > 0) {
        onSuccess(
          `Successfully sent ${successCount} invitation(s)!` +
            (failures.length > 0 ? ` (${failures.length} failed)` : '')
        );
      }

      if (failures.length > 0 && successCount === 0) {
        setInviteError(failures.join(' | '));
      } else {
        onClose();
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || 'Failed to send invitations.');
    } finally {
      setInviting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invite Teammates to Project Group" maxWidth="560px">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {remainingSlots === 0 ? (
          <div
            style={{
              padding: '12px 14px',
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
            <span>This group has reached maximum capacity ({maxCapacity} members). You cannot send additional invitations.</span>
          </div>
        ) : (
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--body-text)', lineHeight: 1.5 }}>
            Search for students in <b>{group?.course}</b> (cross-section allowed). You can invite up to{' '}
            <b style={{ color: 'var(--primary)' }}>{remainingSlots}</b> more member(s) to reach maximum capacity ({maxCapacity}).
          </p>
        )}

        {inviteError && (
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
            <span>{inviteError}</span>
          </div>
        )}

        {/* Search Input */}
        <div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
            Search Student by Roll Number or Name
          </label>
          <div style={{ position: 'relative' }}>
            <Search
              size={16}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              value={inviteRollQuery}
              onChange={(e) => setInviteRollQuery(e.target.value)}
              disabled={remainingSlots === 0}
              placeholder={remainingSlots === 0 ? 'Group is at max capacity' : 'e.g. 21K-3829 or Ali...'}
              style={{
                width: '100%',
                padding: '9px 12px 9px 36px',
                fontSize: '13.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                backgroundColor: remainingSlots === 0 ? '#f1f5f9' : '#ffffff',
                cursor: remainingSlots === 0 ? 'not-allowed' : 'text',
              }}
            />
            {searching && (
              <Loader2
                size={16}
                className="animate-spin"
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}
              />
            )}
          </div>
        </div>

        {/* Selected Peer Chips */}
        {selectedPeers.length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Selected to Invite ({selectedPeers.length} / {remainingSlots}):
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {selectedPeers.map((p) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    backgroundColor: '#e0f2fe',
                    border: '1px solid #bae6fd',
                    borderRadius: '16px',
                    fontSize: '12px',
                    color: '#0369a1',
                    fontWeight: 500,
                  }}
                >
                  <span>
                    {p.name} ({p.roll})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeSelectedPeer(p.id)}
                    style={{
                      border: 'none',
                      background: 'none',
                      color: '#0369a1',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <X size={13} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Results List */}
        <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
          {searchResults.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              {inviteRollQuery.trim() ? (searching ? 'Searching students...' : 'No matching students found.') : 'Type a roll number or name to search.'}
            </div>
          ) : (
            searchResults.map((stu) => {
              const isSelected = selectedPeers.some((p) => p.id === stu.id);
              const disabled = stu.has_group || (selectedPeers.length >= remainingSlots && !isSelected);

              return (
                <div
                  key={stu.id}
                  onClick={() => !disabled && toggleSelectPeer(stu)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    opacity: disabled ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      disabled={disabled}
                      onChange={() => {}}
                      style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                    />
                    <div>
                      <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>{stu.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>
                        Roll: <b>{stu.roll}</b> • Sec {stu.section || 'N/A'} • {stu.dept}
                      </div>
                    </div>
                  </div>

                  <div>
                    {stu.has_group ? (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#f1f5f9',
                          color: '#94a3b8',
                        }}
                      >
                        Already in a group
                      </span>
                    ) : isSelected ? (
                      <span
                        style={{
                          fontSize: '11px',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: '#dcfce7',
                          color: '#15803d',
                          fontWeight: 600,
                        }}
                      >
                        Selected
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Actions */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '10px',
            marginTop: '8px',
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
            onClick={handleSendBatchInvitations}
            disabled={inviting || selectedPeers.length === 0}
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
              cursor: inviting || selectedPeers.length === 0 ? 'not-allowed' : 'pointer',
              opacity: inviting || selectedPeers.length === 0 ? 0.6 : 1,
            }}
          >
            {inviting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
            <span>{inviting ? 'Sending...' : `Send Invitations (${selectedPeers.length})`}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};
