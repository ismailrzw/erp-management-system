import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  GraduationCap,
  Inbox,
  Check,
  X,
  MessageSquare,
  AlertCircle,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { evaluatorApi } from '../../api/evaluatorApi';
import { supervisorsApi } from '../../api/supervisorsApi';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatCard } from '../../components/ui/StatCard';
import { formatDate } from '../../utils/dateUtils';

export function EvaluatorDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState({
    assigned_groups: 0,
    pending_evaluations: 0,
    completed_evaluations: 0,
    meetings_logged: 0,
    active_supervision_count: 0,
    supervision_by_course: {},
  });
  const [supervisorRequests, setSupervisorRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [rejectingRequest, setRejectingRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, reqRes] = await Promise.all([
        evaluatorApi.getDashboard().catch(() => null),
        supervisorsApi.listEvaluatorRequests().catch(() => null),
      ]);

      if (dashRes?.data?.success) {
        setStats(dashRes.data.data);
      }
      if (reqRes?.success && reqRes.data) {
        setSupervisorRequests(reqRes.data.items || reqRes.data || []);
      } else {
        setSupervisorRequests([]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAcceptRequest = async (requestId) => {
    try {
      setProcessingId(requestId);
      const res = await supervisorsApi.acceptRequest(requestId);
      if (res.success) {
        setToast({ message: res.message || 'Supervisor request accepted! Group assigned to you.', type: 'success' });
        fetchData(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to accept supervisor request.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectingRequest) return;
    try {
      setProcessingId(rejectingRequest.id);
      const res = await supervisorsApi.rejectRequest(rejectingRequest.id, rejectionReason.trim());
      if (res.success) {
        setToast({ message: 'Supervisor request declined.', type: 'info' });
        setRejectingRequest(null);
        setRejectionReason('');
        fetchData(true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to decline request.',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const activeSupervisionCount = stats.active_supervision_count || 0;
  const isAtMaxSupervision = activeSupervisionCount >= 4;
  const coursesAtCap = Object.entries(stats.supervision_by_course || {})
    .filter(([, count]) => count >= 4)
    .map(([course]) => course);

  return (
    <div className="page-frame-container" style={{ padding: '0 0 24px' }}>
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Standard Unified Header */}
      <PageHeader
        title="Evaluator Dashboard"
        subtitle={`Welcome back${user?.name ? `, ${user.name}` : ''}! Here is an overview of your assigned groups, supervision requests, and evaluations.`}
      >
        <button
          type="button"
          onClick={() => fetchData(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </PageHeader>

      {/* Supervision Cap Banner if any course is at cap */}
      {coursesAtCap.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '12px 16px',
            backgroundColor: 'var(--primary-light)',
            border: '1px solid rgba(0, 115, 170, 0.25)',
            borderRadius: '8px',
            color: 'var(--primary)',
            fontSize: '13.5px',
            fontWeight: 500,
            marginBottom: '20px',
          }}
        >
          <AlertCircle size={18} color="var(--primary)" style={{ flexShrink: 0 }} />
          <span>
            You have reached your maximum supervision capacity (<b>4 / 4 groups</b>) for{' '}
            <b>{coursesAtCap.join(', ')}</b>. You can still accept supervisor requests for other courses.
          </span>
        </div>
      )}

      {/* Unified Responsive Stat Cards */}
      <div className="stat-grid-4">
        <StatCard
          title="Assigned Groups"
          count={stats.assigned_groups}
          icon={Users}
          color="primary"
          subtext="View all assigned groups"
          onClick={() => navigate('/evaluator/groups')}
        />
        <StatCard
          title="Active Supervisions"
          value={`${activeSupervisionCount} Groups`}
          icon={GraduationCap}
          color="info"
          subtext={
            Object.keys(stats.supervision_by_course || {}).length > 0
              ? Object.entries(stats.supervision_by_course).map(([crs, cnt]) => `${crs}: ${cnt}/4`).join(', ')
              : 'Max 4 groups per course'
          }
          onClick={() => navigate('/evaluator/groups')}
        />
        <StatCard
          title="Pending Evaluations"
          count={stats.pending_evaluations}
          icon={Clock}
          color="warning"
          subtext="Review & score submissions"
          onClick={() => navigate('/evaluator/groups')}
        />
        <StatCard
          title="Meetings Logged"
          count={stats.meetings_logged}
          icon={Calendar}
          color="success"
          subtext="Supervisory meetings log"
          onClick={() => navigate('/evaluator/meetings')}
        />
      </div>

      {loading && !refreshing ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 className="animate-spin" size={26} color="var(--primary)" style={{ display: 'inline-block', marginBottom: '8px' }} />
          <div style={{ fontSize: '13.5px' }}>Loading evaluator requests and assignments...</div>
        </div>
      ) : (
        <>

          {/* Supervisor Requests Inbox Section */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #e2e8f0',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              marginBottom: '32px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '16px',
                borderBottom: '1px solid #f1f5f9',
                marginBottom: '20px',
                flexWrap: 'wrap',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    backgroundColor: '#faf5ff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Inbox size={20} color="#7c3aed" />
                </div>
                <div>
                  <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    Supervisor Requests ({supervisorRequests.length})
                  </h2>
                  <p style={{ fontSize: '12.5px', color: '#64748b', margin: '2px 0 0' }}>
                    Student groups requesting your project supervision. Max cap: 4 groups.
                  </p>
                </div>
              </div>

              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  backgroundColor: isAtMaxSupervision ? '#fee2e2' : '#f0fdf4',
                  color: isAtMaxSupervision ? '#b91c1c' : '#15803d',
                  padding: '3px 10px',
                  borderRadius: '12px',
                  border: isAtMaxSupervision ? '1px solid #fecaca' : '1px solid #bbf7d0',
                }}
              >
                Supervising: {activeSupervisionCount} / 4
              </span>
            </div>

            {supervisorRequests.length === 0 ? (
              <div
                style={{
                  padding: '32px',
                  textAlign: 'center',
                  color: '#94a3b8',
                  fontSize: '13.5px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px dashed #e2e8f0',
                }}
              >
                No pending supervisor requests at this time.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {supervisorRequests.map((req) => {
                  const isProcessing = processingId === req.id;

                  return (
                    <div
                      key={req.id}
                      style={{
                        padding: '16px 18px',
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '16px',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.02)',
                      }}
                    >
                      <div style={{ flex: '1 1 300px', minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                            {req.group_name}
                          </span>
                          <span
                            style={{
                              fontSize: '11px',
                              fontWeight: 600,
                              backgroundColor: '#e0f2fe',
                              color: '#0369a1',
                              padding: '2px 8px',
                              borderRadius: '4px',
                            }}
                          >
                            {req.course}
                          </span>
                          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                            • Requested {formatDate(req.created_at)}
                          </span>
                        </div>

                        <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155', marginTop: '4px' }}>
                          Project: {req.project_title}
                        </div>

                        <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                          Team Leader: <b>{req.leader_name}</b> ({req.leader_roll}) • Section {req.section || 'N/A'} • Dept: {req.dept}
                        </div>

                        {req.request_message && (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginTop: '8px',
                              padding: '8px 12px',
                              backgroundColor: '#f8fafc',
                              border: '1px solid #e2e8f0',
                              borderRadius: '6px',
                              fontSize: '12.5px',
                              color: '#475569',
                              fontStyle: 'italic',
                            }}
                          >
                            <MessageSquare size={13} color="#94a3b8" style={{ flexShrink: 0 }} />
                            <span>"{req.request_message}"</span>
                          </div>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                        <button
                          type="button"
                          onClick={() => handleAcceptRequest(req.id)}
                          disabled={isProcessing || isAtMaxSupervision}
                          title={isAtMaxSupervision ? 'You have reached maximum 4 groups limit' : 'Accept supervision request'}
                          className="btn btn-success"
                        >
                          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          <span>Accept</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setRejectingRequest(req);
                            setRejectionReason('');
                          }}
                          disabled={isProcessing}
                          className="btn btn-danger-outline"
                        >
                          <X size={14} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Decline Confirmation Modal */}
      <Modal
        isOpen={!!rejectingRequest}
        onClose={() => setRejectingRequest(null)}
        title="Decline Supervisor Request"
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155' }}>
            Are you sure you want to decline the supervisor request from <b>{rejectingRequest?.group_name}</b> (Leader: {rejectingRequest?.leader_name})?
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Reason for declining (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Schedule full, out of scope domain..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
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
              onClick={() => setRejectingRequest(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleRejectConfirm}
              disabled={processingId === rejectingRequest?.id}
              className="btn btn-danger"
            >
              {processingId === rejectingRequest?.id ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
              <span>Decline Request</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

