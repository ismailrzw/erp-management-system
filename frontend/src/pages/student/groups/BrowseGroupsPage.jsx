import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  PlusCircle,
  FolderGit2,
  RefreshCw,
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  Layers,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { studentDashboardApi } from '../../../api/studentDashboardApi';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';
import { formatDate } from '../../../utils/dateUtils';

export const BrowseGroupsPage = () => {
  const [invitations, setInvitations] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [existingGroup, setExistingGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, invitesRes] = await Promise.all([
        studentDashboardApi.getDashboard(),
        studentGroupApi.getPendingInvitations(),
      ]);

      if (dashRes.success && dashRes.data) {
        setStudentInfo(dashRes.data.student);
        setExistingGroup(dashRes.data.group);
      }
      if (invitesRes.success && invitesRes.data) {
        setInvitations(invitesRes.data.items || invitesRes.data || []);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load invitations',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAcceptInvite = async (invitationId) => {
    if (existingGroup) {
      setToast({
        message: 'You must leave your current group before accepting a new invitation.',
        type: 'error',
      });
      return;
    }

    try {
      setProcessingId(invitationId);
      const res = await studentGroupApi.acceptInvitation(invitationId);
      if (res.success) {
        setToast({ message: 'Invitation accepted! Welcome to the group.', type: 'success' });
        setTimeout(() => {
          navigate('/student/group/my');
        }, 700);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to accept invitation',
        type: 'error',
      });
      setProcessingId(null);
    }
  };

  const handleDeclineInvite = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      const res = await studentGroupApi.declineInvitation(invitationId);
      if (res.success) {
        setToast({ message: 'Invitation declined.', type: 'info' });
        loadData();
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to decline invitation',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <Preloader text="Loading Invitations & Groups..." />;
  }

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '20px',
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--heading)' }}>
            Group Invitations & Discovery
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--body-text)' }}>
            Course: <b>{studentInfo?.course || 'Course Not Assigned'}</b> (Section {studentInfo?.section || 'N/A'})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => loadData(true)}
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

          {!existingGroup && (
            <button
              type="button"
              onClick={() => navigate('/student/group/create')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              <PlusCircle size={15} />
              <span>Create Group</span>
            </button>
          )}
        </div>
      </div>

      {/* Existing Group Membership Banner (Accurate constraint enforcement) */}
      {existingGroup && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              You are currently a member of <b>{existingGroup.name}</b>. You cannot accept new group invitations while enrolled in an active group. To join another group, you must first leave your current group.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/group/my')}
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#1e40af',
              border: '1px solid #93c5fd',
              borderRadius: '5px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            View My Group
          </button>
        </div>
      )}

      {/* Main Card */}
      <div className="card-responsive" style={{ borderTop: '3px solid var(--primary)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Mail size={18} color="var(--primary)" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
              Pending Group Invitations ({invitations.length})
            </h2>
          </div>
        </div>

        {invitations.length === 0 ? (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 16px',
              color: 'var(--body-text)',
            }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                color: '#94a3b8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 12px',
              }}
            >
              <Mail size={26} />
            </div>
            <h3 style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
              No Pending Invitations
            </h3>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', maxWidth: '420px', marginInline: 'auto' }}>
              When team leaders in your course section invite you to join their project group, your invitations will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {invitations.map((inv) => {
              const isProcessing = processingId === inv.id;
              const inviterName = inv.invited_by_name || inv.leader_name || 'Group Leader';
              const inviterRoll = inv.invited_by_roll || inv.leader_roll;
              const hasGroupBlocked = !!existingGroup;

              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '14px',
                    padding: '16px 18px',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '260px' }}>
                      <div
                        style={{
                          width: '46px',
                          height: '46px',
                          borderRadius: '8px',
                          backgroundColor: '#e0f2fe',
                          color: '#0369a1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: '2px',
                        }}
                      >
                        <FolderGit2 size={24} />
                      </div>

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                            {inv.group_name || 'Project Group'}
                          </span>
                          <span
                            style={{
                              padding: '2px 8px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              borderRadius: '12px',
                              backgroundColor: '#fef3c7',
                              color: '#92400e',
                            }}
                          >
                            Pending
                          </span>
                        </div>

                        <div style={{ fontSize: '13.5px', color: '#1e293b', marginTop: '4px', fontWeight: 500 }}>
                          Project Title: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{inv.project_title || 'Untitled Project'}</span>
                        </div>

                        {/* Metadata Pills */}
                        <div
                          style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            alignItems: 'center',
                            gap: '12px',
                            marginTop: '8px',
                            fontSize: '12px',
                            color: '#64748b',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <BookOpen size={13} />
                            <span>{inv.group_course || studentInfo?.course || 'Course'} ({inv.group_section ? `Sec ${inv.group_section}` : `Sec ${studentInfo?.section}`})</span>
                          </div>

                          <div>•</div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Users size={13} />
                            <span>Invited by: <b>{inviterName}</b> {inviterRoll ? `(${inviterRoll})` : ''}</span>
                          </div>

                          <div>•</div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Layers size={13} />
                            <span>{inv.member_count ? `${inv.member_count} Members` : 'Team forming'}</span>
                          </div>

                          <div>•</div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} />
                            <span>{formatDate(inv.created_at)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                      <button
                        type="button"
                        onClick={() => handleAcceptInvite(inv.id)}
                        disabled={isProcessing || hasGroupBlocked}
                        title={hasGroupBlocked ? 'You must leave your current group before accepting.' : 'Accept and join group'}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          backgroundColor: hasGroupBlocked ? '#94a3b8' : 'var(--success)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: hasGroupBlocked || isProcessing ? 'not-allowed' : 'pointer',
                          transition: 'opacity 0.15s ease',
                          opacity: hasGroupBlocked ? 0.7 : 1,
                        }}
                      >
                        {isProcessing ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <CheckCircle2 size={15} />
                        )}
                        <span>{hasGroupBlocked ? 'In Another Group' : 'Accept'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeclineInvite(inv.id)}
                        disabled={isProcessing}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 14px',
                          backgroundColor: '#ffffff',
                          color: '#dc2626',
                          border: '1px solid #fecaca',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 500,
                          cursor: isProcessing ? 'not-allowed' : 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <XCircle size={15} />
                        <span>Decline</span>
                      </button>
                    </div>
                  </div>

                  {hasGroupBlocked && (
                    <div
                      style={{
                        fontSize: '12px',
                        color: '#b45309',
                        backgroundColor: '#fffbeb',
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #fde68a',
                      }}
                    >
                      ⚠️ You cannot accept this invitation while you are a member of <b>{existingGroup.name}</b>.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
