import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Crown,
  UserPlus,
  Edit,
  Edit2,
  LogOut,
  Trash2,
  AlertCircle,
  FolderGit2,
  PlusCircle,
  Compass,
  RefreshCw,
  BookOpen,
  Layers,
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  Calendar,
  MessageSquare,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { useAuth } from '../../../context/useAuth';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';
import { InviteModal } from '../../../components/student/groups/InviteModal';
import { LeadershipTransferModal } from '../../../components/student/groups/LeadershipTransferModal';
import { EditGroupModal } from '../../../components/student/groups/EditGroupModal';
import { GroupMemberList } from '../../../components/student/groups/GroupMemberList';
import { formatDate } from '../../../utils/dateUtils';

export const MyGroupPage = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingReqId, setProcessingReqId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Edit Group Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editModalMode, setEditModalMode] = useState('all'); // 'name' | 'all'

  // Member Remove Modal
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

  const fetchGroup = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await studentGroupApi.getMyGroup();
      if (res.success && res.data) {
        setGroup(res.data);
        const leaderFlag = res.data.members?.find((m) => m.id === user?.id)?.is_leader || res.data.is_leader;
        if (leaderFlag) {
          try {
            const reqRes = await studentGroupApi.getIncomingJoinRequests();
            if (reqRes.success && reqRes.data) {
              setIncomingRequests(reqRes.data.items || []);
            }
          } catch {
            setIncomingRequests([]);
          }
        }
      } else {
        setGroup(null);
        setIncomingRequests([]);
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
  }, [user?.id]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Edit Group Form Handlers
  const handleOpenEditModal = (mode = 'all') => {
    if (!group) return;
    setEditModalMode(mode);
    setIsEditModalOpen(true);
  };

  // Remove Member Handlers
  const handleConfirmRemoveMember = async () => {
    if (!memberToRemove || !group) return;
    try {
      setRemoving(true);
      const res = await studentGroupApi.removeMember(group.id, memberToRemove.id);
      if (res.success) {
        setToast({ message: `${memberToRemove.name || 'Member'} has been removed.`, type: 'success' });
        setMemberToRemove(null);
        fetchGroup(true);
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

  // Accept Join Request Handler
  const handleAcceptJoinRequest = async (requestId) => {
    try {
      setProcessingReqId(requestId);
      const res = await studentGroupApi.acceptJoinRequest(requestId);
      if (res.success) {
        setToast({ message: res.message || 'Applicant added to group!', type: 'success' });
        fetchGroup(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to accept join request',
        type: 'error',
      });
    } finally {
      setProcessingReqId(null);
    }
  };

  // Reject Join Request Handler
  const handleRejectJoinRequest = async (requestId) => {
    try {
      setProcessingReqId(requestId);
      const res = await studentGroupApi.rejectJoinRequest(requestId);
      if (res.success) {
        setToast({ message: 'Join request declined.', type: 'info' });
        fetchGroup(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to decline join request',
        type: 'error',
      });
    } finally {
      setProcessingReqId(null);
    }
  };

  if (loading) {
    return <Preloader text="Loading Project Group..." />;
  }

  // If student has no group
  if (!group) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        {toast.message && (
          <Toast
            message={toast.message}
            type={toast.type}
            onClose={() => setToast({ message: '', type: 'success' })}
          />
        )}

        <PageHeader title="My Project Group" subtitle="You are not enrolled in any project group.">
          <button
            type="button"
            onClick={() => fetchGroup(true)}
            disabled={refreshing}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              backgroundColor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              color: '#334155',
              cursor: refreshing ? 'not-allowed' : 'pointer',
            }}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </PageHeader>

        <div className="card-responsive">
          <EmptyState
            icon={Users}
            title="No Active Project Group"
            description="You are currently not part of any project group. Create a new group to become a team leader or browse invitations and available groups."
            action={
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center' }}>
                <button
                  type="button"
                  onClick={() => navigate('/student/group/create')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <PlusCircle size={16} />
                  <span>Create New Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/student/group/browse')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '9px 18px',
                    fontSize: '13.5px',
                    fontWeight: 500,
                    backgroundColor: '#ffffff',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    color: '#334155',
                    cursor: 'pointer',
                  }}
                >
                  <Compass size={16} />
                  <span>Browse Groups & Invites</span>
                </button>
              </div>
            }
          />
        </div>
      </div>
    );
  }

  const isLeader = group.members?.find((m) => m.id === user?.id)?.is_leader || group.is_leader;
  const isApproved = group.status === 'approved';
  const isRejected = group.status === 'rejected';
  const currentMemberCount = group.members?.length || group.member_count || 1;
  const maxCapacity = group.max_group || 4;
  const isFull = currentMemberCount >= maxCapacity;

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span>{group.name}</span>
            {isLeader && !isApproved && (
              <button
                type="button"
                onClick={() => handleOpenEditModal('name')}
                title="Change Group Name"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#e2e8f0';
                  e.currentTarget.style.color = 'var(--primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                <Edit2 size={13} />
                <span>Change Name</span>
              </button>
            )}
          </div>
        }
        badge={<StatusBadge status={group.status} />}
        subtitle={`Course: ${group.course} • Section ${group.section} • Department: ${group.dept}`}
      >
        <button
          type="button"
          onClick={() => fetchGroup(true)}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            color: '#334155',
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        {isLeader && !isApproved && (
          <button
            type="button"
            onClick={() => handleOpenEditModal('all')}
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
            <span>Edit Proposal</span>
          </button>
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
            backgroundColor: '#ffffff',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#dc2626',
            cursor: 'pointer',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
        >
          <LogOut size={14} />
          <span>Leave Group</span>
        </button>
      </PageHeader>

      {/* Rejection Alert Banner if group was rejected */}
      {isRejected && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '16px 20px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: '1 1 300px' }}>
            <AlertCircle size={22} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: '#991b1b' }}>
                Group Proposal Requires Revisions
              </div>
              <div style={{ fontSize: '13.5px', color: '#b91c1c', marginTop: '4px', lineHeight: 1.5 }}>
                <b>Manager Feedback:</b> {group.rejection_reason || 'Please revise your project title and details.'}
              </div>
              <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '6px' }}>
                Note: {isLeader ? 'Click "Update Proposal & Resubmit" to revise project details and resubmit for approval.' : 'The group leader can revise project details to resubmit for approval.'}
              </div>
            </div>
          </div>

          {isLeader && (
            <button
              type="button"
              onClick={() => handleOpenEditModal('all')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              <Edit size={14} />
              <span>Update Proposal & Resubmit</span>
            </button>
          )}
        </div>
      )}

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
        {/* Card 1: Project Information */}
        <div className="card-responsive" style={{ borderTop: '3px solid var(--primary)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderGit2 size={18} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
                Project Information
              </h2>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Project Title
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '3px', wordBreak: 'break-word' }}>
                {group.project_title || 'Untitled Project'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                Group Name
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#334155', marginTop: '2px', wordBreak: 'break-word' }}>
                {group.name}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '4px' }}>
              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Course
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                  {group.course}
                </div>
              </div>

              <div>
                <div style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>
                  Section
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>
                  Sec {group.section}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
              <span>Created on: {formatDate(group.created_at)}</span>
            </div>
          </div>
        </div>

        {/* Card 2: Team Members & Actions */}
        <div className="card-responsive" style={{ borderTop: '3px solid var(--success)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} color="var(--success)" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
                Team Members ({currentMemberCount} / {maxCapacity})
              </h2>
            </div>

            {isLeader && !isFull && !isApproved && (
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 12px',
                  fontSize: '12.5px',
                  fontWeight: 600,
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={14} />
                <span>+ Invite Peer</span>
              </button>
            )}
          </div>

          <GroupMemberList
            members={group.members || []}
            isLeader={isLeader}
            currentUserId={user?.id}
            isGroupApproved={isApproved}
            onRemoveMember={(m) => setMemberToRemove(m)}
          />

          {isLeader && isFull && (
            <div
              style={{
                padding: '10px 14px',
                backgroundColor: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                fontSize: '12.5px',
                color: '#1e40af',
                marginTop: '12px',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              Your group has reached maximum capacity ({maxCapacity} members). No more members can be invited or joined.
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Incoming Join Requests (Leader Only) */}
      {isLeader && incomingRequests.length > 0 && (
        <div className="card-responsive" style={{ marginTop: '20px', borderTop: '3px solid #f59e0b' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserCheck size={18} color="#d97706" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
                Incoming Join Requests ({incomingRequests.length})
              </h2>
            </div>
            {isFull && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#fee2e2',
                  color: '#b91c1c',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                Group Full
              </span>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {incomingRequests.map((req) => {
              const isProcessing = processingReqId === req.id;

              return (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    padding: '12px 14px',
                    backgroundColor: '#fffbeb',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                  }}
                >
                  <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      {req.applicant_name} <span style={{ fontSize: '12px', color: '#64748b' }}>({req.applicant_roll})</span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Section {req.applicant_section || 'N/A'} • {req.applicant_email} • Applied: {formatDate(req.created_at)}
                    </div>
                    {req.message && (
                      <div
                        style={{
                          fontSize: '12px',
                          color: '#475569',
                          marginTop: '4px',
                          fontStyle: 'italic',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <MessageSquare size={12} />
                        <span>"{req.message}"</span>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      type="button"
                      onClick={() => handleAcceptJoinRequest(req.id)}
                      disabled={isProcessing || isFull}
                      title={isFull ? 'Group is at max capacity' : 'Accept candidate into group'}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 14px',
                        fontSize: '12.5px',
                        fontWeight: 600,
                        backgroundColor: isFull ? '#94a3b8' : 'var(--success)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '5px',
                        cursor: isFull || isProcessing ? 'not-allowed' : 'pointer',
                        opacity: isFull ? 0.7 : 1,
                      }}
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      <span>Accept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectJoinRequest(req.id)}
                      disabled={isProcessing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px',
                        padding: '6px 12px',
                        fontSize: '12.5px',
                        fontWeight: 500,
                        backgroundColor: '#ffffff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        borderRadius: '5px',
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                    >
                      <XCircle size={13} />
                      <span>Decline</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Modals */}
      <InviteModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        group={group}
        onSuccess={(msg) => {
          setToast({ message: msg, type: 'success' });
          fetchGroup(true);
        }}
      />

      <LeadershipTransferModal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        group={group}
        currentUserId={user?.id}
        onSuccess={(msg) => {
          setToast({ message: msg, type: 'info' });
          setTimeout(() => navigate('/student/group/browse'), 700);
        }}
      />

      <EditGroupModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        group={group}
        mode={editModalMode}
        onSuccess={() => {
          setToast({
            message: editModalMode === 'name' ? 'Group name updated successfully!' : 'Group proposal updated successfully!',
            type: 'success',
          });
          fetchGroup(true);
        }}
      />

      {/* Remove Member Confirmation Modal */}
      <Modal isOpen={!!memberToRemove} onClose={() => setMemberToRemove(null)} title="Confirm Member Removal" maxWidth="450px">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155' }}>
            Are you sure you want to remove <b>{memberToRemove?.name}</b> ({memberToRemove?.roll}) from the group?
          </p>

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
              onClick={() => setMemberToRemove(null)}
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
              onClick={handleConfirmRemoveMember}
              disabled={removing}
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
                cursor: removing ? 'not-allowed' : 'pointer',
              }}
            >
              {removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              <span>{removing ? 'Removing...' : 'Remove Member'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
