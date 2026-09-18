import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
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
  CheckCircle2,
  XCircle,
  Loader2,
  UserCheck,
  MessageSquare,
  GraduationCap,
  Award,
  Clock,
  Search,
  Send,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { supervisorsApi } from '../../../api/supervisorsApi';
import { useAuth } from '../../../context/useAuth';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
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

  // Supervisor Workflow States
  const [pendingSupervisorRequest, setPendingSupervisorRequest] = useState(null);
  const [availableSupervisors, setAvailableSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [supervisorSearch, setSupervisorSearch] = useState('');
  const [selectedDomain, setSelectedDomain] = useState('ALL');
  const [selectedSupervisor, setSelectedSupervisor] = useState(null);
  const [supervisorRequestMessage, setSupervisorRequestMessage] = useState('');
  const [isSupervisorModalOpen, setIsSupervisorModalOpen] = useState(false);
  const [submittingSupervisorReq, setSubmittingSupervisorReq] = useState(false);
  const [cancellingSupervisorReq, setCancellingSupervisorReq] = useState(false);

  const fetchSupervisorData = useCallback(async () => {
    try {
      const reqRes = await supervisorsApi.getMyRequest();
      if (reqRes.success && reqRes.data) {
        setPendingSupervisorRequest(reqRes.data);
      } else {
        setPendingSupervisorRequest(null);
      }
    } catch {
      setPendingSupervisorRequest(null);
    }
  }, []);

  const fetchAvailableSupervisors = useCallback(async () => {
    setLoadingSupervisors(true);
    try {
      const res = await supervisorsApi.listAvailable();
      if (res.success && res.data) {
        setAvailableSupervisors(res.data.items || res.data || []);
      }
    } catch {
      setAvailableSupervisors([]);
    } finally {
      setLoadingSupervisors(false);
    }
  }, []);

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
        // Fetch supervisor request status
        fetchSupervisorData();
        fetchAvailableSupervisors();
      } else {
        setGroup(null);
        setIncomingRequests([]);
        setPendingSupervisorRequest(null);
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
  }, [user?.id, fetchSupervisorData, fetchAvailableSupervisors]);

  useEffect(() => {
    fetchGroup();
  }, [fetchGroup]);

  // Supervisor Request Handlers
  const handleOpenSupervisorRequestModal = (supervisor) => {
    setSelectedSupervisor(supervisor);
    setSupervisorRequestMessage('');
    setIsSupervisorModalOpen(true);
  };

  const handleSendSupervisorRequest = async () => {
    if (!selectedSupervisor || !group) return;
    try {
      setSubmittingSupervisorReq(true);
      const res = await supervisorsApi.createRequest({
        evaluator_id: selectedSupervisor.id,
        request_message: supervisorRequestMessage.trim() || undefined,
      });
      if (res.success) {
        setToast({ message: 'Supervisor request sent successfully!', type: 'success' });
        setIsSupervisorModalOpen(false);
        setSelectedSupervisor(null);
        setSupervisorRequestMessage('');
        fetchSupervisorData();
        fetchAvailableSupervisors();
        fetchGroup(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to submit supervisor request.',
        type: 'error',
      });
    } finally {
      setSubmittingSupervisorReq(false);
    }
  };

  const handleCancelSupervisorRequest = async () => {
    if (!pendingSupervisorRequest) return;
    try {
      setCancellingSupervisorReq(true);
      const res = await supervisorsApi.cancelRequest(pendingSupervisorRequest.id);
      if (res.success) {
        setToast({ message: 'Supervisor request cancelled.', type: 'info' });
        setPendingSupervisorRequest(null);
        fetchAvailableSupervisors();
        fetchGroup(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to cancel request.',
        type: 'error',
      });
    } finally {
      setCancellingSupervisorReq(false);
    }
  };

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

  if (loading && !refreshing && !group) {
    return (
      <div className="page-frame-container">
        <PageHeader title="My Project Group" subtitle="Loading project group details..." />
        <ContentLoader label="Loading project group..." />
      </div>
    );
  }

  // If student has no group
  if (!group) {
    return (
      <div className="page-frame-container">
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
            className="btn btn-ghost btn-sm"
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
                  className="btn btn-primary"
                >
                  <PlusCircle size={16} />
                  <span>Create New Group</span>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('/student/group/browse')}
                  className="btn btn-secondary"
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
    <div className="page-frame-container">
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
                className="btn btn-ghost btn-sm"
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
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        {isLeader && !isApproved && (
          <button
            type="button"
            onClick={() => handleOpenEditModal('all')}
            className="btn btn-secondary"
          >
            <Edit size={14} />
            <span>Edit Proposal</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => setIsLeaveModalOpen(true)}
          className="btn btn-danger-outline"
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
              className="btn btn-danger"
              style={{ flexShrink: 0 }}
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
                className="btn btn-primary btn-sm"
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
                backgroundColor: 'var(--primary-light)',
                border: '1px solid rgba(0, 115, 170, 0.2)',
                borderRadius: '6px',
                fontSize: '12.5px',
                color: 'var(--primary)',
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

      {/* Card: Supervisor Management */}
      <div className="card-responsive" style={{ marginTop: '20px', borderTop: '3px solid #8b5cf6' }}>
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
            <GraduationCap size={18} color="#8b5cf6" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
              Project Supervisor
            </h2>
          </div>

          {group.supervisor_name && (
            <span
              style={{
                fontSize: '12px',
                fontWeight: 600,
                backgroundColor: '#f5f3ff',
                color: '#7c3aed',
                border: '1px solid #ddd6fe',
                padding: '3px 10px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              <Award size={13} />
              <span>Assigned & Active</span>
            </span>
          )}
        </div>

        {/* 1. Group already has an assigned supervisor */}
        {group.supervisor_name ? (
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fbfbfe',
              border: '1px solid #e9d5ff',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '50%',
                  backgroundColor: '#8b5cf6',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {group.supervisor_name.charAt(0).toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 700, color: '#1e1b4b' }}>
                  {group.supervisor_name}
                </div>
                <div style={{ fontSize: '12.5px', color: '#6b7280', marginTop: '2px' }}>
                  Project Supervisor • Department of {group.dept || 'Computing'}
                </div>
              </div>
            </div>

            <div style={{ fontSize: '12.5px', color: '#6d28d9', fontWeight: 500 }}>
              Group supervision is confirmed for {group.course}.
            </div>
          </div>
        ) : pendingSupervisorRequest ? (
          /* 2. Group has a pending supervisor request */
          <div
            style={{
              padding: '16px',
              backgroundColor: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#d97706" />
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#92400e' }}>
                  Pending Supervisor Request
                </span>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  backgroundColor: '#fef3c7',
                  color: '#b45309',
                  padding: '2px 8px',
                  borderRadius: '10px',
                }}
              >
                Awaiting Supervisor Response
              </span>
            </div>

            <div style={{ fontSize: '13.5px', color: '#78350f' }}>
              Request sent to <b>{pendingSupervisorRequest.evaluator_name}</b> ({pendingSupervisorRequest.evaluator_email}) on {formatDate(pendingSupervisorRequest.created_at)}.
            </div>

            {pendingSupervisorRequest.request_message && (
              <div
                style={{
                  fontSize: '12.5px',
                  color: '#92400e',
                  fontStyle: 'italic',
                  backgroundColor: '#ffffff',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #fef08a',
                }}
              >
                "{pendingSupervisorRequest.request_message}"
              </div>
            )}

            {isLeader && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button
                  type="button"
                  onClick={handleCancelSupervisorRequest}
                  disabled={cancellingSupervisorReq}
                  className="btn btn-danger-outline btn-sm"
                >
                  {cancellingSupervisorReq ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
                  <span>Cancel Supervisor Request</span>
                </button>
              </div>
            )}
          </div>
        ) : isLeader ? (
          /* 3. No supervisor & user is leader -> supervisor browse & request UI */
          <div>
            <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748b' }}>
              Browse faculty members and request project supervision. Each evaluator may supervise up to 4 project groups per specific course.
            </div>

            {/* Filters Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '16px',
              }}
            >
              <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: '360px' }}>
                <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
                <input
                  type="text"
                  placeholder="Search by faculty name or domain..."
                  value={supervisorSearch}
                  onChange={(e) => setSupervisorSearch(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '7px 10px 7px 32px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Domain Filter Pills */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setSelectedDomain('ALL')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '12px',
                    fontWeight: 600,
                    borderRadius: '12px',
                    border: selectedDomain === 'ALL' ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                    backgroundColor: selectedDomain === 'ALL' ? 'var(--primary)' : '#ffffff',
                    color: selectedDomain === 'ALL' ? '#ffffff' : '#64748b',
                    cursor: 'pointer',
                  }}
                >
                  All Domains
                </button>
                {Array.from(new Set(availableSupervisors.flatMap((s) => s.domains || [])))
                  .filter(Boolean)
                  .map((dom) => (
                    <button
                      key={dom}
                      type="button"
                      onClick={() => setSelectedDomain(dom)}
                      style={{
                        padding: '4px 10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        borderRadius: '12px',
                        border: selectedDomain === dom ? '1px solid var(--primary)' : '1px solid #e2e8f0',
                        backgroundColor: selectedDomain === dom ? 'var(--primary)' : '#ffffff',
                        color: selectedDomain === dom ? '#ffffff' : '#64748b',
                        cursor: 'pointer',
                      }}
                    >
                      {dom}
                    </button>
                  ))}
              </div>
            </div>

            {/* Supervisors Grid */}
            {loadingSupervisors ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
                Loading available supervisors...
              </div>
            ) : availableSupervisors.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', fontSize: '13px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
                No supervisor profiles found.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                  gap: '14px',
                }}
              >
                {availableSupervisors
                  .filter((s) => {
                    const matchSearch =
                      !supervisorSearch ||
                      s.name?.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
                      s.email?.toLowerCase().includes(supervisorSearch.toLowerCase()) ||
                      (s.domains || []).some((d) => d.toLowerCase().includes(supervisorSearch.toLowerCase()));
                    const matchDomain = selectedDomain === 'ALL' || (s.domains && s.domains.includes(selectedDomain));
                    return matchSearch && matchDomain;
                  })
                  .map((sup) => {
                    const count = sup.active_supervision_count || 0;
                    const isAtCap = count >= 4;

                    return (
                      <div
                        key={sup.id}
                        style={{
                          padding: '14px',
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: '12px',
                          boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                            <div>
                              <div style={{ fontSize: '14.5px', fontWeight: 700, color: '#1e293b' }}>
                                {sup.name}
                              </div>
                              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                {sup.email}
                              </div>
                              {sup.dept && (
                                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '1px' }}>
                                  Dept: {sup.dept}
                                </div>
                              )}
                            </div>

                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 700,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: isAtCap ? '#fee2e2' : '#f0fdf4',
                                color: isAtCap ? '#dc2626' : '#16a34a',
                                border: isAtCap ? '1px solid #fecaca' : '1px solid #bbf7d0',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {count}/4 Groups {group?.course ? `(${group.course})` : ''}
                            </span>
                          </div>

                          {/* Domain Tags */}
                          {sup.domains && sup.domains.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '10px' }}>
                              {sup.domains.map((dom, i) => (
                                <span
                                  key={i}
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 500,
                                    backgroundColor: '#f1f5f9',
                                    color: '#475569',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  {dom}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleOpenSupervisorRequestModal(sup)}
                          disabled={isAtCap}
                          className="btn btn-primary btn-sm"
                        >
                          <Send size={13} />
                          <span>{isAtCap ? 'Capacity Full' : 'Request Supervision'}</span>
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        ) : (
          /* 4. No supervisor & user is not leader */
          <div
            style={{
              padding: '14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            No supervisor assigned yet. Only the team leader can send a supervisor request to faculty members.
          </div>
        )}
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
                      className="btn btn-success btn-sm"
                    >
                      {isProcessing ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                      <span>Accept</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRejectJoinRequest(req.id)}
                      disabled={isProcessing}
                      className="btn btn-danger-outline btn-sm"
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
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmRemoveMember}
              disabled={removing}
              className="btn btn-danger"
            >
              {removing ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
              <span>{removing ? 'Removing...' : 'Remove Member'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* Request Supervisor Modal */}
      <Modal
        isOpen={isSupervisorModalOpen}
        onClose={() => setIsSupervisorModalOpen(false)}
        title={`Request Supervision — ${selectedSupervisor?.name || ''}`}
        maxWidth="520px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
            }}
          >
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
              Faculty Member: {selectedSupervisor?.name}
            </div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
              {selectedSupervisor?.email} {selectedSupervisor?.dept ? `• Dept of ${selectedSupervisor.dept}` : ''}
            </div>
            {selectedSupervisor?.domains && selectedSupervisor.domains.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '8px' }}>
                {selectedSupervisor.domains.map((dom, i) => (
                  <span
                    key={i}
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      backgroundColor: '#e2e8f0',
                      color: '#334155',
                      padding: '2px 6px',
                      borderRadius: '4px',
                    }}
                  >
                    {dom}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', marginBottom: '4px' }}>
              Project Group: {group?.name}
            </div>
            <div style={{ fontSize: '13px', color: '#475569' }}>
              <b>Title:</b> {group?.project_title}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Message or Proposal Summary to Supervisor (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Provide context on why you would like this faculty member to supervise your project..."
              value={supervisorRequestMessage}
              onChange={(e) => setSupervisorRequestMessage(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                resize: 'vertical',
                fontFamily: 'inherit',
              }}
            />
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setIsSupervisorModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSendSupervisorRequest}
              disabled={submittingSupervisorReq}
              className="btn btn-primary"
            >
              {submittingSupervisorReq ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{submittingSupervisorReq ? 'Submitting...' : 'Send Supervisor Request'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
