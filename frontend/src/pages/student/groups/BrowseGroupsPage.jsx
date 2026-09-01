import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Compass,
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  PlusCircle,
  FolderGit2,
  RefreshCw,
  Crown,
  Loader2,
  Info,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { studentDashboardApi } from '../../../api/studentDashboardApi';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';
import { formatDate } from '../../../utils/dateUtils';

export const BrowseGroupsPage = () => {
  const [activeTab, setActiveTab] = useState('invites'); // 'invites' | 'info'
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
    try {
      setProcessingId(invitationId);
      const res = await studentGroupApi.acceptInvitation(invitationId);
      if (res.success) {
        setToast({ message: 'Invitation accepted! Welcome to the group.', type: 'success' });
        setTimeout(() => {
          navigate('/student/group/my');
        }, 800);
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
            Course: <b>{studentInfo?.course}</b> (Section {studentInfo?.section})
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              cursor: 'pointer',
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

      {/* Existing Group Warning Banner if already in group */}
      {existingGroup && (
        <div
          style={{
            display: 'flex',
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Info size={18} />
            <span>
              You are currently in <b>{existingGroup.name}</b>. Accepting a new invitation will transfer your membership.
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/group/my')}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#1e40af',
              border: '1px solid #93c5fd',
              borderRadius: '4px',
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

          <span style={{ fontSize: '12.5px', color: 'var(--muted)' }}>
            Pull Model: Real-time responses
          </span>
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
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)', maxWidth: '380px', marginInline: 'auto' }}>
              When group leaders in your section invite you to join their project team, requests will appear here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {invitations.map((inv) => {
              const isProcessing = processingId === inv.id;

              return (
                <div
                  key={inv.id}
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '14px',
                    padding: '16px 18px',
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '240px' }}>
                    <div
                      style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '8px',
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <FolderGit2 size={22} />
                    </div>

                    <div>
                      <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {inv.group_name || 'Project Group'}
                      </div>
                      <div style={{ fontSize: '13px', color: '#334155', marginTop: '2px' }}>
                        Project: <b>{inv.project_title || 'Untitled'}</b>
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        Invited by: <b>{inv.invited_by_name || 'Group Leader'}</b> ({inv.invited_by_roll || 'Leader'}) • {formatDate(inv.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => handleAcceptInvite(inv.id)}
                      disabled={isProcessing}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '8px 16px',
                        backgroundColor: 'var(--success)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        transition: 'opacity 0.15s ease',
                      }}
                    >
                      {isProcessing ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      <span>Accept</span>
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
