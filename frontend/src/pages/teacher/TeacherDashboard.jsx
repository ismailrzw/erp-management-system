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
  FileText,
  AlertCircle,
  Loader2,
  Check,
} from 'lucide-react';
import { teacherPortalApi } from '../../api/teacherPortalApi';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { ContentLoader } from '../../components/ui/ContentLoader';

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
        message: err.response?.data?.message || 'Failed to load teacher dashboard',
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

  if (loading && !refreshing) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Teacher & Supervisor Portal"
          subtitle="Overview of your supervised project groups and incoming requests."
        />
        <ContentLoader label="Loading dashboard..." />
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
  const capacityPercent = Math.min(100, Math.round((activeCap / maxCap) * 100));

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Welcome Banner */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0073aa 0%, #005177 100%)',
          borderRadius: '10px',
          padding: '24px 28px',
          color: '#ffffff',
          marginBottom: '24px',
          boxShadow: '0 4px 15px rgba(0, 115, 170, 0.2)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: 0.9, fontSize: '13px', marginBottom: '4px' }}>
            <GraduationCap size={16} />
            <span>Faculty & Supervisor Portal · Department of {teacher.dept || 'CS'}</span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '22px', fontWeight: 700 }}>
            Welcome back, {teacher.name}!
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12.5px', opacity: 0.9 }}>Expertise Domains:</span>
            {teacher.domains && teacher.domains.length > 0 ? (
              teacher.domains.map((d, i) => (
                <span
                  key={i}
                  style={{
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    backdropFilter: 'blur(4px)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '11px',
                    fontWeight: 500,
                  }}
                >
                  {d}
                </span>
              ))
            ) : (
              <span
                onClick={() => navigate('/teacher/profile')}
                style={{ fontSize: '12px', textDecoration: 'underline', cursor: 'pointer', opacity: 0.9 }}
              >
                + Add your expertise domains
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.3)',
            color: '#ffffff',
            padding: '8px 14px',
            borderRadius: '6px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.15s ease',
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh Data'}</span>
        </button>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '18px', marginBottom: '26px' }}>
        <StatCard
          icon={FolderGit2}
          label="My Supervised Groups"
          value={activeCap}
          trend={`${activeCap} active FYP project teams`}
        />

        <StatCard
          icon={Users}
          label="Total Students"
          value={stats.total_students_count || 0}
          trend="Mentored students across all groups"
        />

        {/* Supervision Capacity Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '20px 22px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Supervision Capacity
              </div>
              <div style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', marginTop: '4px' }}>
                {activeCap} / {maxCap} <span style={{ fontSize: '14px', fontWeight: 500, color: '#64748b' }}>Groups</span>
              </div>
            </div>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: activeCap >= maxCap ? '#fee2e2' : '#eaf5fb',
                color: activeCap >= maxCap ? '#dc2626' : '#0073aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
          </div>

          <div>
            <div style={{ width: '100%', height: '8px', backgroundColor: '#e2e8f0', borderRadius: '4px', overflow: 'hidden', marginBottom: '6px' }}>
              <div
                style={{
                  width: `${capacityPercent}%`,
                  height: '100%',
                  backgroundColor: activeCap >= maxCap ? '#dc2626' : '#0073aa',
                  borderRadius: '4px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
              <span>{activeCap >= maxCap ? 'Maximum limit reached' : `${maxCap - activeCap} slots available`}</span>
              <span style={{ fontWeight: 600 }}>{capacityPercent}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Incoming Supervision Requests Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: '22px',
          marginBottom: '26px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={18} color="#0073aa" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              Incoming Supervision Requests
            </h2>
            <span
              style={{
                backgroundColor: incomingRequests.length > 0 ? '#fef3c7' : '#f1f5f9',
                color: incomingRequests.length > 0 ? '#b45309' : '#64748b',
                padding: '2px 8px',
                borderRadius: '10px',
                fontSize: '11.5px',
                fontWeight: 700,
              }}
            >
              {incomingRequests.length} Pending
            </span>
          </div>
        </div>

        {incomingRequests.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: '#94a3b8' }}>
            <CheckCircle2 size={36} color="#16a34a" style={{ margin: '0 auto 8px', opacity: 0.8 }} />
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '13.5px' }}>
              No pending supervision requests
            </div>
            <div style={{ fontSize: '12px', marginTop: '2px' }}>
              New invitation requests from FYP student group leaders will appear here.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {incomingRequests.map((req) => (
              <div
                key={req.id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                  padding: '16px 18px',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '14px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 700, color: '#0f172a', fontSize: '14.5px' }}>
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
                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                      ({req.member_count || 1} members)
                    </span>
                  </div>

                  <div style={{ fontSize: '13px', color: '#334155', fontWeight: 500 }}>
                    Project: {req.project_title || 'Untitled'}
                  </div>

                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                    Team Lead: <b>{req.leader_name}</b> ({req.leader_roll}) · {req.leader_email}
                  </div>

                  {req.request_message && (
                    <div
                      style={{
                        marginTop: '8px',
                        padding: '8px 12px',
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

                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setRequestToReject(req);
                      setRejectionReason('');
                    }}
                    className="btn btn-danger-outline btn-sm"
                  >
                    <XCircle size={14} />
                    <span>Reject</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRequestToAccept(req)}
                    disabled={activeCap >= maxCap}
                    className="btn btn-success btn-sm"
                    title={activeCap >= maxCap ? 'Supervision cap reached (4/4)' : 'Accept request'}
                  >
                    <Check size={14} />
                    <span>Accept Request</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Supervised Groups Section */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FolderGit2 size={18} color="#0073aa" />
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              My Supervised Groups ({groups.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => navigate('/teacher/groups')}
            className="btn btn-ghost btn-sm"
          >
            <span>View All Groups</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {groups.length === 0 ? (
          <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
            <FolderGit2 size={40} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>
              You are not supervising any active groups yet
            </div>
            <div style={{ fontSize: '12.5px', marginTop: '3px' }}>
              When you accept incoming supervision requests from students, your groups will appear here.
            </div>
          </div>
        ) : (
          <div className="table-responsive-container table-wide" style={{ borderRadius: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Group / Project</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Team Lead</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Course & Section</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Members</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '10px 14px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr key={g.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{g.name}</div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '1px' }}>
                        {g.project_title || 'Untitled Project'}
                      </div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ color: '#334155', fontWeight: 500 }}>{g.leader_name}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{g.leader_roll}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <div>{g.course}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>{g.dept} · Sec {g.section}</div>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <span
                        style={{
                          backgroundColor: '#f1f5f9',
                          color: '#334155',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                      >
                        {g.member_count} Students
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <StatusBadge status={g.status} />
                    </td>
                    <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/teacher/groups/${g.id}`)}
                        className="btn btn-primary btn-sm"
                      >
                        <span>Manage Group</span>
                        <ArrowRight size={13} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
