import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FolderGit2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  GraduationCap,
  Loader2,
  Check,
  Tag,
  AlertCircle,
} from 'lucide-react';
import { teacherPortalApi } from '../../api/teacherPortalApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { ContentLoader } from '../../components/ui/ContentLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProposalSummary } from '../../components/groups/ProposalSummary';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';

export const TeacherDashboard = () => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals for Request Actions
  const [requestToAccept, setRequestToAccept] = useState(null);
  const [requestToReject, setRequestToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await teacherPortalApi.getDashboard();
      if (res.success && res.data) {
        setDashboardData(res.data);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load supervisor dashboard',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useLiveRefresh(() => fetchDashboard(true));

  const handleAccept = async () => {
    if (!requestToAccept) return;
    try {
      setActionLoading(true);
      const res = await teacherPortalApi.acceptSupervisorRequest(requestToAccept.id);
      if (res.success) {
        setToast({ message: 'Supervisor request accepted successfully!', type: 'success' });
        setRequestToAccept(null);
        fetchDashboard(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to accept request',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!requestToReject) return;
    try {
      setActionLoading(true);
      const res = await teacherPortalApi.rejectSupervisorRequest(requestToReject.id, rejectionReason.trim());
      if (res.success) {
        setToast({ message: 'Supervisor request rejected.', type: 'info' });
        setRequestToReject(null);
        setRejectionReason('');
        fetchDashboard(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to reject request',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing && !dashboardData) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Supervisor Portal"
          subtitle="Loading your supervised project groups and incoming invitations..."
        />
        <ContentLoader label="Loading supervisor dashboard..." />
      </div>
    );
  }

  const teacher = dashboardData?.teacher || {};
  const stats = dashboardData?.stats || {
    active_groups_count: 0,
    max_supervision_cap: 4,
    total_students_count: 0,
    pending_requests_count: 0,
  };
  const incomingRequests = dashboardData?.incoming_requests || [];
  const groups = dashboardData?.groups || [];

  const activeCap = stats.active_groups_count || 0;
  const maxCap = stats.max_supervision_cap || 4;

  return (
    <div className="page-frame-container">
      {/* Toast Feedback */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${teacher.name || 'Faculty Member'}!`}
        subtitle={`Supervisor Portal • Department of ${teacher.dept || 'CS'} • ${teacher.email || ''}`}
      >
        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </PageHeader>

      {/* 4 Standardized Metric Cards (Aligns with Student & Manager dashboards) */}
      <div className="stat-grid-4">
        <StatCard
          title="Supervised Groups"
          value={activeCap}
          icon={FolderGit2}
          color="primary"
          subtext={`${activeCap} active FYP project teams`}
          onClick={() => navigate('/teacher/groups')}
        />

        <StatCard
          title="Mentored Students"
          value={stats.total_students_count || 0}
          icon={Users}
          color="info"
          subtext="Students across all groups"
          onClick={() => navigate('/teacher/students')}
        />

        <StatCard
          title="Incoming Requests"
          value={incomingRequests.length}
          icon={Clock}
          color={incomingRequests.length > 0 ? 'warning' : 'muted'}
          subtext={incomingRequests.length > 0 ? `${incomingRequests.length} pending invitations` : 'No pending requests'}
        />

        <StatCard
          title="Supervision Capacity"
          value={`${activeCap} / ${maxCap}`}
          icon={GraduationCap}
          color={activeCap >= maxCap ? 'danger' : 'success'}
          subtext={activeCap >= maxCap ? 'Maximum capacity reached' : `${maxCap - activeCap} supervision slot(s) open`}
        />
      </div>

      {/* Pending Requests Alert Banner */}
      {incomingRequests.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '14px 20px',
            backgroundColor: '#fffbeb',
            border: '1px solid #fef3c7',
            borderLeft: '4px solid #f59e0b',
            borderRadius: '8px',
            marginBottom: '20px',
            marginTop: '8px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <AlertCircle size={20} color="#d97706" style={{ flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#92400e' }}>
                You have {incomingRequests.length} incoming supervision request{incomingRequests.length > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '12.5px', color: '#b45309', marginTop: '2px' }}>
                Student project teams are waiting for your acceptance to begin project milestones.
              </div>
            </div>
          </div>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              backgroundColor: '#fde68a',
              color: '#92400e',
              padding: '3px 10px',
              borderRadius: '12px',
            }}
          >
            Action Required
          </span>
        </div>
      )}

      {/* Dual Panel Layout */}
      <div className="dashboard-dual-grid" style={{ marginTop: '8px' }}>
        {/* Left Panel: Supervised Groups */}
        <div
          className="card-responsive"
          style={{
            borderTop: '3px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderGit2 size={18} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
                My Supervised Groups ({groups.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/teacher/groups')}
              className="btn btn-ghost btn-sm"
              style={{ fontSize: '12px' }}
            >
              <span>View All</span>
              <ArrowRight size={13} />
            </button>
          </div>

          {groups.length === 0 ? (
            <EmptyState
              icon={FolderGit2}
              title="No supervised groups yet"
              description="When you accept incoming supervision requests from students, your active groups will appear here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {groups.map((g) => (
                <div
                  key={g.id}
                  style={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '15px', color: '#0f172a' }}>
                        {g.name}
                      </div>
                      <div style={{ fontSize: '13px', color: '#475569', fontWeight: 500, marginTop: '2px' }}>
                        {g.project_title || 'Untitled Project'}
                      </div>
                    </div>
                    <StatusBadge status={g.status} />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#64748b', flexWrap: 'wrap' }}>
                    <div>Leader: <b>{g.leader_name}</b> ({g.leader_roll})</div>
                    <div>•</div>
                    <div>Course: <b>{g.course}</b></div>
                    <div>•</div>
                    <div>Sec: <b>{g.section}</b></div>
                    <div>•</div>
                    <div><b>{g.member_count} Students</b></div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid #eef2f6' }}>
                    <button
                      type="button"
                      onClick={() => navigate(`/teacher/groups/${g.id}`)}
                      className="btn btn-primary btn-sm"
                    >
                      <span>Manage Group</span>
                      <ArrowRight size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Panel: Incoming Requests & Domain Expertise */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Incoming Requests Panel */}
          <div
            className="card-responsive"
            style={{
              borderTop: '3px solid #f59e0b',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '12px',
                borderBottom: '1px solid #f1f5f9',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={18} color="#d97706" />
                <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
                  Incoming Supervision Requests ({incomingRequests.length})
                </h2>
              </div>
            </div>

            {incomingRequests.length === 0 ? (
              <div style={{ padding: '28px 16px', textAlign: 'center', color: '#94a3b8' }}>
                <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
                <div style={{ fontWeight: 600, color: '#475569', fontSize: '13.5px' }}>
                  No pending supervision requests
                </div>
                <div style={{ fontSize: '12px', marginTop: '3px' }}>
                  New requests from FYP student group leaders will appear here for your review.
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {incomingRequests.map((req) => (
                  <div
                    key={req.id}
                    style={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      padding: '14px 16px',
                      backgroundColor: '#f8fafc',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14px' }}>
                          {req.group_name || 'Project Group'}
                        </span>
                        <span
                          style={{
                            backgroundColor: '#eef6fb',
                            color: '#0073aa',
                            padding: '2px 7px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                          }}
                        >
                          {req.course || 'FYP'}
                        </span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                        Project: {req.project_title || 'Untitled'}
                      </div>

                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                        Lead: <b>{req.leader_name}</b> ({req.leader_roll}) • {req.leader_email}
                      </div>

                      <details style={{ marginTop: '8px', fontSize: '12px' }}>
                        <summary style={{ cursor: 'pointer', color: '#0073aa', fontWeight: 600 }}>
                          Review Proposal & Team Members ({req.members?.length || req.member_count || 1})
                        </summary>
                        <div style={{ marginTop: '8px', padding: '10px', backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                          <ProposalSummary proposal={req.proposal} />
                          <div style={{ marginTop: '10px', fontSize: '12px', color: '#475569' }}>
                            <b>Team Members:</b>
                            {(req.members || []).map((m) => (
                              <div key={m.id || m.roll} style={{ marginTop: '2px' }}>
                                • {m.name} ({m.roll}) - {m.dept || ''}
                              </div>
                            ))}
                          </div>
                        </div>
                      </details>

                      {req.request_message && (
                        <div
                          style={{
                            marginTop: '8px',
                            padding: '8px 10px',
                            backgroundColor: '#ffffff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '4px',
                            fontSize: '12px',
                            color: '#475569',
                            fontStyle: 'italic',
                          }}
                        >
                          "{req.request_message}"
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', alignItems: 'center', paddingTop: '8px', borderTop: '1px solid #eef2f6' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setRequestToReject(req);
                          setRejectionReason('');
                        }}
                        className="btn btn-danger-outline btn-sm"
                      >
                        <XCircle size={13} />
                        <span>Decline</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setRequestToAccept(req)}
                        disabled={activeCap >= maxCap}
                        className="btn btn-success btn-sm"
                        title={activeCap >= maxCap ? 'Supervision cap reached (4/4)' : 'Accept request'}
                      >
                        <Check size={13} />
                        <span>Accept Request</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Info & Expertise Domains Card */}
          <div
            className="card-responsive"
            style={{
              padding: '18px 20px',
              backgroundColor: '#ffffff',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Tag size={15} color="#0073aa" />
                <h3 style={{ margin: 0, fontSize: '13.5px', fontWeight: 700, color: '#1e293b' }}>
                  Research Domains & Expertise
                </h3>
              </div>
              <button
                type="button"
                onClick={() => navigate('/teacher/profile')}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '11.5px', padding: '3px 8px' }}
              >
                Edit in Settings
              </button>
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {teacher.domains && teacher.domains.length > 0 ? (
                teacher.domains.map((d, i) => (
                  <span
                    key={i}
                    style={{
                      backgroundColor: '#eef6fb',
                      color: '#0073aa',
                      padding: '3px 9px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                    }}
                  >
                    {d}
                  </span>
                ))
              ) : (
                <div style={{ fontSize: '12.5px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No domain tags configured yet. Click "Edit in Settings" to add expertise areas for students to find you.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Confirm Accept */}
      <Modal isOpen={!!requestToAccept} onClose={() => setRequestToAccept(null)} title="Accept Supervision Request" maxWidth="460px">
        <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5, marginBottom: '18px' }}>
          Are you sure you want to accept supervision of project group <strong>{requestToAccept?.group_name}</strong>?
          <div style={{ marginTop: '10px', padding: '10px 12px', backgroundColor: '#f8fafc', borderRadius: '6px', fontSize: '12.5px' }}>
            <div>Project: <b>{requestToAccept?.project_title}</b></div>
            <div>Course: <b>{requestToAccept?.course}</b></div>
            <div>Leader: <b>{requestToAccept?.leader_name}</b> ({requestToAccept?.leader_roll})</div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={() => setRequestToAccept(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleAccept} disabled={actionLoading} className="btn btn-success">
            {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
            <span>{actionLoading ? 'Accepting...' : 'Confirm Accept'}</span>
          </button>
        </div>
      </Modal>

      {/* Modal: Confirm Reject */}
      <Modal isOpen={!!requestToReject} onClose={() => setRequestToReject(null)} title="Decline Supervision Request" maxWidth="480px">
        <form onSubmit={handleReject}>
          <div style={{ fontSize: '13.5px', color: '#334155', lineHeight: 1.5, marginBottom: '14px' }}>
            Decline supervision request from <strong>{requestToReject?.group_name}</strong>. You can optionally provide feedback:
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Reason / Feedback (Optional)
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. Current research capacity is full in this domain, or project scope needs refinement..."
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button type="button" onClick={() => setRequestToReject(null)} className="btn btn-secondary">
              Cancel
            </button>
            <button type="submit" disabled={actionLoading} className="btn btn-danger">
              {actionLoading ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
              <span>{actionLoading ? 'Declining...' : 'Decline Request'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
