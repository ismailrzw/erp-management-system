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
  FolderGit2,
  PlusCircle,
  Compass,
  RefreshCw,
  BookOpen,
  Layers,
  ShieldCheck,
  Loader2,
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
import { GroupMemberList } from '../../../components/student/groups/GroupMemberList';
import { formatDate } from '../../../utils/dateUtils';

export const MyGroupPage = () => {
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  // Modals
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);

  // Edit Group Modal States
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: '', project_title: '' });
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState('');

  // Member Remove Modal
  const [memberToRemove, setMemberToRemove] = useState(null);
  const [removing, setRemoving] = useState(false);

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

  // Edit Group Form Handlers
  const handleOpenEditModal = () => {
    if (!group) return;
    setEditFormData({
      name: group.name || '',
      project_title: group.project_title || '',
    });
    setEditError('');
    setIsEditModalOpen(true);
  };

  const handleSaveEditGroup = async (e) => {
    e.preventDefault();
    const name = editFormData.name.trim();
    const project_title = editFormData.project_title.trim();

    if (!name || name.length < 3) {
      setEditError('Group name must be at least 3 characters.');
      return;
    }
    if (!project_title || project_title.length < 5) {
      setEditError('Project title must be at least 5 characters.');
      return;
    }

    try {
      setEditing(true);
      setEditError('');
      const res = await studentGroupApi.updateGroup(group.id, { name, project_title });
      if (res.success) {
        setToast({ message: 'Group details updated successfully! Proposal submitted.', type: 'success' });
        setIsEditModalOpen(false);
        fetchGroup(true);
      }
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update group');
    } finally {
      setEditing(false);
    }
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
            description="You are currently not part of any project group. Create a new group to become a team leader or browse invitations from peers."
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
        title={group.name}
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
            onClick={handleOpenEditModal}
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
            <span>Edit Group</span>
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
                💡 {isLeader ? 'Click "Edit Proposal" to revise project details and resubmit for approval.' : 'The group leader can revise project details to resubmit for approval.'}
              </div>
            </div>
          </div>

          {isLeader && (
            <button
              type="button"
              onClick={handleOpenEditModal}
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
              <span>Edit Proposal</span>
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
                fontSize: '12px',
                color: '#15803d',
                backgroundColor: '#dcfce7',
                padding: '8px 12px',
                borderRadius: '6px',
                marginTop: '12px',
                textAlign: 'center',
                fontWeight: 500,
              }}
            >
              🎉 Your group has reached maximum capacity ({maxCapacity} members)!
            </div>
          )}
        </div>
      </div>

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

      {/* Edit Group Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Group Proposal" maxWidth="500px">
        <form onSubmit={handleSaveEditGroup} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {editError && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#b91c1c',
                fontSize: '13px',
              }}
            >
              {editError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Group Name *
            </label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Project Title *
            </label>
            <input
              type="text"
              value={editFormData.project_title}
              onChange={(e) => setEditFormData({ ...editFormData, project_title: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>

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
              onClick={() => setIsEditModalOpen(false)}
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
              disabled={editing}
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
                cursor: editing ? 'not-allowed' : 'pointer',
              }}
            >
              {editing ? <Loader2 size={15} className="animate-spin" /> : <Edit size={15} />}
              <span>{editing ? 'Saving...' : 'Save & Resubmit'}</span>
            </button>
          </div>
        </form>
      </Modal>

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
