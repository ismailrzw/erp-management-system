import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Crown,
  UserPlus,
  Edit,
  LogOut,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Search,
  Loader2,
  FolderGit2,
  PlusCircle,
  Compass,
  RefreshCw,
  Info,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { useAuth } from '../../../context/useAuth';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';

export const MyGroupPage = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  // Invite Modal States
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteRoll, setInviteRoll] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  // Edit Group Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', project_title: '' });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Member Remove Modal
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  // Leave Group Modal
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const fetchGroup = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await studentGroupApi.getMyGroup();
      if (res.success) {
        setGroup(res.data);
      } else {
        setGroup(null);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load group details',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Peer Search on input change
  useEffect(() => {
    if (!inviteRoll.trim() || inviteRoll.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await studentGroupApi.searchStudents(inviteRoll.trim());
        if (res.success && res.data?.items) {
          setSearchResults(res.data.items);
        }
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [inviteRoll]);

  const handleOpenInvite = () => {
    setInviteRoll('');
    setSearchResults([]);
    setInviteError('');
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (rollToSend) => {
    const targetRoll = rollToSend || inviteRoll.trim();
    if (!targetRoll) {
      setInviteError('Please enter or select a student roll number.');
      return;
    }

    try {
      setInviting(true);
      setInviteError('');
      const res = await studentGroupApi.inviteMember(group.id, targetRoll);
      if (res.success) {
        setToast({ message: `Invitation sent to ${targetRoll}!`, type: 'success' });
        setIsInviteModalOpen(false);
      }
    } catch (err) {
      setInviteError(err.response?.data?.message || err.message || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleOpenEdit = () => {
    setEditFormData({
      name: group.name,
      project_title: group.project_title || '',
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editFormData.name.trim() || !editFormData.project_title.trim()) {
      setEditError('All fields are required.');
      return;
    }

    try {
      setEditing(true);
      setEditError('');
      const res = await studentGroupApi.updateGroup(group.id, {
        name: editFormData.name.trim(),
        project_title: editFormData.project_title.trim(),
      });
      if (res.success) {
        setToast({ message: 'Group details updated successfully!', type: 'success' });
        setIsEditModalOpen(false);
        fetchGroup();
      }
    } catch (err) {
      setEditError(err.response?.data?.message || err.message || 'Failed to update group');
    } finally {
      setEditing(false);
    }
  };

  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      setRemoving(true);
      const res = await studentGroupApi.removeMember(group.id, memberToRemove.id);
      if (res.success) {
        setToast({ message: `${memberToRemove.name} removed from group.`, type: 'success' });
        setMemberToRemove(null);
        fetchGroup();
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to remove member',
        type: 'error',
      });
    } finally {
      setRemoving(false);
    }
  };

  const handleConfirmLeaveGroup = async () => {
    try {
      setLeaving(true);
      const res = await studentGroupApi.leaveGroup(group.id);
      if (res.success) {
        setToast({ message: res.message || 'You have left the group.', type: 'success' });
        setIsLeaveModalOpen(false);
        setTimeout(() => {
          navigate('/student/dashboard');
        }, 800);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to leave group',
        type: 'error',
      });
    } finally {
      setLeaving(false);
    }
  };

  if (loading) {
    return <Preloader text="Loading Project Group..." />;
  }

  // Not in a group
  if (!group) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto 0' }}>
        <div
          className="card-responsive"
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            borderTop: '3px solid var(--warning)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fef9c3',
              color: '#ca8a04',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Users size={32} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--heading)' }}>
            You are not in any Project Group
          </h2>
          <p
            style={{
              margin: '0 auto 24px',
              fontSize: '14px',
              color: 'var(--body-text)',
              maxWidth: '460px',
              lineHeight: '1.5',
            }}
          >
            Form a new group as leader and invite your classmates, or browse open groups in your course section and accept pending invitations.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/student/group/create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <PlusCircle size={16} />
              <span>Create a New Group</span>
            </button>

            <button
              type="button"
              onClick={() => navigate('/student/group/browse')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              <Compass size={16} />
              <span>Browse Groups & Invites</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isLeader = group.is_leader || group.leader_id === user?.id || group.leader_id === user?._id;
  const memberCount = group.members?.length || group.member_count || 1;
  const maxGroup = group.max_group || 5;
  const minGroup = group.min_group || 2;
  const isFull = memberCount >= maxGroup;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Header Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--heading)' }}>
              {group.name}
            </h1>
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                backgroundColor: group.status === 'approved' ? '#dcfce7' : '#fef9c3',
                color: group.status === 'approved' ? '#15803d' : '#a16207',
                textTransform: 'uppercase',
                letterSpacing: '0.3px',
              }}
            >
              {group.status}
            </span>
          </div>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--body-text)' }}>
            {group.project_title || 'No project title set'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => fetchGroup(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#334155',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>

          {isLeader && (
            <>
              <button
                type="button"
                onClick={handleOpenEdit}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 14px',
                  fontSize: '13px',
                  fontWeight: 500,
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  cursor: 'pointer',
                }}
              >
                <Edit size={14} />
                <span>Edit Project</span>
              </button>

              <button
                type="button"
                onClick={handleOpenInvite}
                disabled={isFull}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: isFull ? '#94a3b8' : 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isFull ? 'not-allowed' : 'pointer',
                }}
              >
                <UserPlus size={15} />
                <span>{isFull ? 'Group Full' : 'Invite Peer'}</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setIsLeaveModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            <LogOut size={14} />
            <span>Leave Group</span>
          </button>
        </div>
      </div>

      {/* Meta Bar */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '16px',
          padding: '12px 18px',
          backgroundColor: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          marginBottom: '22px',
          fontSize: '13px',
          color: '#475569',
        }}
      >
        <div>Department: <b>{group.dept}</b></div>
        <div>•</div>
        <div>Section: <b>{group.section}</b></div>
        <div>•</div>
        <div>Course: <b>{group.course}</b></div>
        <div>•</div>
        <div>
          Capacity: <b>{memberCount} / {maxGroup}</b> (Min required: {minGroup})
        </div>
      </div>

      {/* Members Section */}
      <div className="card-responsive" style={{ borderTop: '3px solid var(--primary)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Users size={18} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
              Group Members ({memberCount})
            </h2>
          </div>

          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
            {maxGroup - memberCount} slot{maxGroup - memberCount === 1 ? '' : 's'} remaining
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {group.members?.map((m) => {
            const isMemberLeader = m.is_leader || m.id === group.leader_id;
            const isMe = m.id === user?.id || m.id === user?._id;

            return (
              <div
                key={m.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  backgroundColor: isMemberLeader ? '#eff6ff' : '#f8fafc',
                  border: isMemberLeader ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                  borderRadius: '8px',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      backgroundColor: isMemberLeader ? 'var(--primary)' : '#cbd5e1',
                      color: isMemberLeader ? '#ffffff' : '#1e293b',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: '15px',
                      flexShrink: 0,
                    }}
                  >
                    {m.name?.[0]?.toUpperCase() || 'S'}
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                        {m.name}
                      </span>
                      {isMe && (
                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#0369a1',
                            backgroundColor: '#e0f2fe',
                            padding: '1px 6px',
                            borderRadius: '4px',
                          }}
                        >
                          You
                        </span>
                      )}
                      {isMemberLeader && (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#b45309',
                            backgroundColor: '#fef3c7',
                            padding: '2px 8px',
                            borderRadius: '10px',
                          }}
                        >
                          <Crown size={12} /> Leader
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Roll: <b>{m.roll}</b>
                    </div>
                  </div>
                </div>

                {/* Leader Actions on other members */}
                {isLeader && !isMemberLeader && (
                  <button
                    type="button"
                    onClick={() => setMemberToRemove(m)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 500,
                      backgroundColor: '#ffffff',
                      color: '#dc2626',
                      border: '1px solid #fecaca',
                      borderRadius: '4px',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <Trash2 size={13} />
                    <span>Remove</span>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Invite Peer Modal ── */}
      {isInviteModalOpen && (
        <Modal
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          title="Invite Peer to Project Group"
        >
          <div>
            <p style={{ margin: '0 0 14px', fontSize: '13px', color: 'var(--body-text)' }}>
              Search for eligible students in <b>{group.dept} - Section {group.section}</b> by their roll number.
            </p>

            {inviteError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {inviteError}
              </div>
            )}

            <div style={{ position: 'relative', marginBottom: '14px' }}>
              <Search
                size={16}
                color="#94a3b8"
                style={{ position: 'absolute', left: '12px', top: '12px' }}
              />
              <input
                type="text"
                placeholder="Type roll number (e.g. SE-F23, 001)..."
                value={inviteRoll}
                onChange={(e) => setInviteRoll(e.target.value)}
                style={{
                  width: '100%',
                  padding: '9px 12px 9px 36px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                autoFocus
              />
              {searching && (
                <Loader2
                  size={16}
                  className="animate-spin"
                  style={{ position: 'absolute', right: '12px', top: '12px', color: '#94a3b8' }}
                />
              )}
            </div>

            {/* Suggestions list */}
            {searchResults.length > 0 && (
              <div
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  marginBottom: '16px',
                }}
              >
                {searchResults.map((s) => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderBottom: '1px solid #f1f5f9',
                      fontSize: '13px',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{s.name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>Roll: {s.roll}</div>
                    </div>

                    {s.has_group ? (
                      <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>
                        Already in a group
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendInvite(s.roll)}
                        disabled={inviting}
                        style={{
                          padding: '4px 10px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: 'var(--primary)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                        }}
                      >
                        Invite
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '16px' }}>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                disabled={inviting}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSendInvite()}
                disabled={inviting || !inviteRoll.trim()}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: inviting || !inviteRoll.trim() ? 'not-allowed' : 'pointer',
                }}
              >
                {inviting ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                <span>{inviting ? 'Sending...' : 'Send Invitation'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Project Details Modal ── */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Project Group Details"
        >
          <form onSubmit={handleSaveEdit}>
            {editError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: 'var(--danger-light)',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  color: '#b91c1c',
                  fontSize: '13px',
                  marginBottom: '14px',
                }}
              >
                {editError}
              </div>
            )}

            <div style={{ marginBottom: '14px' }}>
              <label
                htmlFor="edit_name"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
              >
                Group Name
              </label>
              <input
                id="edit_name"
                type="text"
                value={editFormData.name}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="edit_title"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}
              >
                Project Title / Idea
              </label>
              <input
                id="edit_title"
                type="text"
                value={editFormData.project_title}
                onChange={(e) => setEditFormData((prev) => ({ ...prev, project_title: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                disabled={editing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: editing ? 'not-allowed' : 'pointer',
                }}
              >
                {editing && <Loader2 size={15} className="animate-spin" />}
                <span>{editing ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Remove Member Modal ── */}
      {memberToRemove && (
        <Modal
          isOpen={!!memberToRemove}
          onClose={() => setMemberToRemove(null)}
          title="Remove Member from Group"
        >
          <div>
            <p style={{ margin: '0 0 16px', fontSize: '13.5px', color: '#334155', lineHeight: '1.5' }}>
              Are you sure you want to remove <b>{memberToRemove.name}</b> (Roll: {memberToRemove.roll}) from <b>{group.name}</b>?
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setMemberToRemove(null)}
                disabled={removing}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRemoveMember}
                disabled={removing}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: removing ? 'not-allowed' : 'pointer',
                }}
              >
                {removing && <Loader2 size={15} className="animate-spin" />}
                <span>{removing ? 'Removing...' : 'Yes, Remove Member'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Leave Group Modal ── */}
      {isLeaveModalOpen && (
        <Modal
          isOpen={isLeaveModalOpen}
          onClose={() => setIsLeaveModalOpen(false)}
          title="Leave Project Group"
        >
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '10px',
                padding: '12px',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#991b1b',
                fontSize: '13px',
                marginBottom: '16px',
                lineHeight: '1.5',
              }}
            >
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                {isLeader && memberCount > 1 ? (
                  <span>
                    You are the designated <b>Group Leader</b>. Leaving will automatically transfer leadership to the next remaining member.
                  </span>
                ) : isLeader && memberCount === 1 ? (
                  <span>
                    You are the <b>only member</b>. Leaving will permanently delete this group.
                  </span>
                ) : (
                  <span>
                    You will be removed from <b>{group.name}</b> and will be able to join or create another group.
                  </span>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setIsLeaveModalOpen(false)}
                disabled={leaving}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#ffffff',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmLeaveGroup}
                disabled={leaving}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  backgroundColor: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: leaving ? 'not-allowed' : 'pointer',
                }}
              >
                {leaving && <Loader2 size={15} className="animate-spin" />}
                <span>{leaving ? 'Leaving Group...' : 'Yes, Leave Group'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
