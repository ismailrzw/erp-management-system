import { useState, useEffect, useCallback } from 'react';
import {
  FolderGit2,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  Calendar,
} from 'lucide-react';
import { managerGroupsApi } from '../../../api/managerGroupsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { coursesApi } from '../../../api/coursesApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';
import { formatDate } from '../../../utils/dateUtils';

export const ManageGroupsPage = () => {
  const [groups, setGroups] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Dropdowns reference data
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  // Modals
  const [groupToApprove, setGroupToApprove] = useState(null);
  const [groupToReject, setGroupToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedGroupDetail, setSelectedGroupDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectError, setRejectError] = useState('');

  const fetchGroups = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = {
          page,
          limit: pagination.limit,
          status: statusFilter !== 'all' ? statusFilter : undefined,
          dept: selectedDept || undefined,
          course: selectedCourse || undefined,
          search: search.trim() || undefined,
        };

        const res = await managerGroupsApi.getGroups(params);
        if (res.success && res.data) {
          setGroups(res.data.items || []);
          setCounts(res.data.counts || { all: 0, pending: 0, approved: 0, rejected: 0 });
          setPagination({
            page: res.data.page,
            limit: res.data.limit,
            total: res.data.total,
            pages: res.data.pages,
          });
        }
      } catch (err) {
        setToast({
          message: err.response?.data?.message || 'Failed to load project groups',
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [statusFilter, selectedDept, selectedCourse, search, pagination.limit]
  );

  useEffect(() => {
    fetchGroups(1);
  }, [fetchGroups]);

  // Load dropdown options once
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [deptRes, courseRes] = await Promise.all([
          departmentsApi.getDepartments({ limit: 100, deleted: false }),
          coursesApi.getCourses({ limit: 100, deleted: false }),
        ]);
        if (deptRes.success && deptRes.data?.items) {
          setDepartments(deptRes.data.items);
        }
        if (courseRes.success && courseRes.data?.items) {
          setCourses(courseRes.data.items);
        }
      } catch {
        // graceful fallback
      }
    };
    loadFilters();
  }, []);

  const handleApprove = async () => {
    if (!groupToApprove) return;
    try {
      setActionLoading(true);
      const res = await managerGroupsApi.approveGroup(groupToApprove.id);
      if (res.success) {
        setToast({ message: `Group '${groupToApprove.name}' approved successfully!`, type: 'success' });
        setGroupToApprove(null);
        fetchGroups(pagination.page, true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to approve group',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    if (!groupToReject) return;
    if (!rejectionReason.trim()) {
      setRejectError('Please provide feedback explaining the reason for rejection.');
      return;
    }

    try {
      setActionLoading(true);
      setRejectError('');
      const res = await managerGroupsApi.rejectGroup(groupToReject.id, rejectionReason.trim());
      if (res.success) {
        setToast({ message: `Group '${groupToReject.name}' rejected with feedback.`, type: 'info' });
        setGroupToReject(null);
        setRejectionReason('');
        fetchGroups(pagination.page, true);
      }
    } catch (err) {
      setRejectError(err.response?.data?.message || 'Failed to reject group');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = async (group) => {
    try {
      const res = await managerGroupsApi.getGroupDetail(group.id);
      if (res.success && res.data) {
        setSelectedGroupDetail(res.data);
      } else {
        setSelectedGroupDetail(group);
      }
    } catch {
      setSelectedGroupDetail(group);
    }
  };

  if (loading && !refreshing) {
    return <Preloader text="Loading Project Groups..." />;
  }

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
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
        title="Manage Project Groups"
        subtitle="Review, approve, or provide revision feedback on student group formation requests."
      >
        <button
          type="button"
          onClick={() => fetchGroups(pagination.page, true)}
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

      {/* Status Counters Tab Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: statusFilter === 'all' ? 700 : 500,
            color: statusFilter === 'all' ? 'var(--primary)' : '#64748b',
            border: 'none',
            borderBottom: statusFilter === 'all' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <span>All Groups</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {counts.all}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: statusFilter === 'pending' ? 700 : 500,
            color: statusFilter === 'pending' ? 'var(--primary)' : '#64748b',
            border: 'none',
            borderBottom: statusFilter === 'pending' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <span>Pending Approval</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: counts.pending > 0 ? '#fef3c7' : '#f1f5f9',
              color: counts.pending > 0 ? '#92400e' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {counts.pending}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: statusFilter === 'approved' ? 700 : 500,
            color: statusFilter === 'approved' ? 'var(--primary)' : '#64748b',
            border: 'none',
            borderBottom: statusFilter === 'approved' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <span>Approved</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: '#dcfce7',
              color: '#15803d',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {counts.approved}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: statusFilter === 'rejected' ? 700 : 500,
            color: statusFilter === 'rejected' ? 'var(--primary)' : '#64748b',
            border: 'none',
            borderBottom: statusFilter === 'rejected' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <span>Needs Revision</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {counts.rejected}
          </span>
        </button>
      </div>

      {/* Toolbar Filters */}
      <div
        className="toolbar-responsive"
        style={{
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '18px',
        }}
      >
        <div className="toolbar-group-left">
          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search group name or project..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                fontSize: '13px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                outline: 'none',
              }}
            />
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#334155',
              outline: 'none',
            }}
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              backgroundColor: '#ffffff',
              color: '#334155',
              outline: 'none',
            }}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Groups Table Card */}
      <div className="card-responsive" style={{ padding: 0, overflow: 'hidden' }}>
        {groups.length === 0 ? (
          <EmptyState
            icon={FolderGit2}
            title="No project groups found"
            description="No groups match the selected filters. Change status tabs or clear the search query."
          />
        ) : (
          <div className="table-responsive-container">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    GROUP / PROJECT
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    LEADER
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    COURSE & DEPT
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    MEMBERS
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    STATUS
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                    CREATED
                  </th>
                  <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>
                    ACTIONS
                  </th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => (
                  <tr
                    key={g.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    <td style={{ padding: '14px 16px', minWidth: '220px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a' }}>{g.name}</div>
                      <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                        {g.project_title || 'Untitled Project'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', minWidth: '150px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {g.leader_name || 'Group Leader'}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Roll: <b>{g.leader_roll || 'N/A'}</b> {g.leader_section ? `(Sec ${g.leader_section})` : ''}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', minWidth: '160px' }}>
                      <div style={{ fontSize: '13px', color: '#1e293b' }}>{g.course}</div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        {g.dept} • Sec {g.section || 'N/A'}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} color="#64748b" />
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                          {g.member_count || 1} / {g.max_group || 4}
                        </span>
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <StatusBadge status={g.status} size="small" />
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#64748b' }}>
                      {formatDate(g.created_at)}
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(g)}
                          style={{
                            padding: '6px 10px',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="View full group details"
                        >
                          <Eye size={13} />
                          <span>View</span>
                        </button>

                        {g.status !== 'approved' && (
                          <button
                            type="button"
                            onClick={() => setGroupToApprove(g)}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: 'var(--success)',
                              color: '#ffffff',
                              border: 'none',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Approve this group"
                          >
                            <CheckCircle2 size={13} />
                            <span>Approve</span>
                          </button>
                        )}

                        {g.status !== 'rejected' && (
                          <button
                            type="button"
                            onClick={() => {
                              setGroupToReject(g);
                              setRejectionReason('');
                              setRejectError('');
                            }}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: '#ffffff',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: '4px',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                            title="Reject group with feedback"
                          >
                            <XCircle size={13} />
                            <span>Reject</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Footer */}
        {pagination.pages > 1 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 18px',
              borderTop: '1px solid #e2e8f0',
              backgroundColor: '#f8fafc',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ fontSize: '13px', color: '#64748b' }}>
              Showing {groups.length} of {pagination.total} groups (Page {pagination.page} of {pagination.pages})
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button
                type="button"
                onClick={() => fetchGroups(pagination.page - 1)}
                disabled={pagination.page <= 1}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#334155',
                  cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                  opacity: pagination.page <= 1 ? 0.5 : 1,
                }}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <button
                type="button"
                onClick={() => fetchGroups(pagination.page + 1)}
                disabled={pagination.page >= pagination.pages}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '6px 12px',
                  fontSize: '12px',
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  color: '#334155',
                  cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                  opacity: pagination.page >= pagination.pages ? 0.5 : 1,
                }}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* APPROVE CONFIRMATION MODAL */}
      <Modal
        isOpen={!!groupToApprove}
        onClose={() => setGroupToApprove(null)}
        title="Confirm Group Approval"
        maxWidth="480px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
            Are you sure you want to approve project group <b>{groupToApprove?.name}</b>?
          </p>

          <div
            style={{
              padding: '12px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '6px',
              fontSize: '12.5px',
              color: '#475569',
            }}
          >
            <div>Project Title: <b>{groupToApprove?.project_title}</b></div>
            <div style={{ marginTop: '4px' }}>Course: <b>{groupToApprove?.course}</b> (Sec {groupToApprove?.section})</div>
            <div style={{ marginTop: '4px' }}>Leader: <b>{groupToApprove?.leader_name}</b> ({groupToApprove?.leader_roll})</div>
            <div style={{ marginTop: '4px' }}>Total Members: <b>{groupToApprove?.member_count || 1}</b></div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              marginTop: '4px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setGroupToApprove(null)}
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
              onClick={handleApprove}
              disabled={actionLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                backgroundColor: 'var(--success)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                cursor: actionLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
              <span>{actionLoading ? 'Approving...' : 'Approve Group'}</span>
            </button>
          </div>
        </div>
      </Modal>

      {/* REJECT WITH FEEDBACK MODAL */}
      <Modal
        isOpen={!!groupToReject}
        onClose={() => setGroupToReject(null)}
        title="Reject Group Proposal & Provide Feedback"
        maxWidth="520px"
      >
        <form onSubmit={handleReject} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {rejectError && (
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
              {rejectError}
            </div>
          )}

          <p style={{ margin: 0, fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
            Provide constructive feedback for <b>{groupToReject?.name}</b> explaining why the proposal needs changes and what the team should focus on.
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Feedback / Rejection Reason *
            </label>
            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="e.g. The project title is too broad. Please refine the scope to focus specifically on mobile notifications module, and ensure minimum team capacity..."
              required
              style={{
                width: '100%',
                padding: '10px 12px',
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
              marginTop: '4px',
              paddingTop: '12px',
              borderTop: '1px solid #e2e8f0',
            }}
          >
            <button
              type="button"
              onClick={() => setGroupToReject(null)}
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
              disabled={actionLoading}
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
                cursor: actionLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {actionLoading ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
              <span>{actionLoading ? 'Rejecting...' : 'Reject with Feedback'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* VIEW GROUP DETAIL MODAL */}
      <Modal
        isOpen={!!selectedGroupDetail}
        onClose={() => setSelectedGroupDetail(null)}
        title="Project Group Details"
        maxWidth="600px"
      >
        {selectedGroupDetail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                  {selectedGroupDetail.name}
                </h3>
                <div style={{ fontSize: '14px', color: 'var(--primary)', fontWeight: 600, marginTop: '2px' }}>
                  {selectedGroupDetail.project_title || 'Untitled Project'}
                </div>
              </div>
              <StatusBadge status={selectedGroupDetail.status} />
            </div>

            {selectedGroupDetail.rejection_reason && (
              <div
                style={{
                  padding: '12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '13px',
                  color: '#b91c1c',
                }}
              >
                <b>Rejection Feedback:</b> {selectedGroupDetail.rejection_reason}
              </div>
            )}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '12px',
                backgroundColor: '#f8fafc',
                borderRadius: '6px',
                fontSize: '12.5px',
                color: '#334155',
              }}
            >
              <div>Course: <b>{selectedGroupDetail.course}</b></div>
              <div>Department: <b>{selectedGroupDetail.dept}</b></div>
              <div>Section: <b>Sec {selectedGroupDetail.section}</b></div>
              <div>Created: <b>{formatDate(selectedGroupDetail.created_at)}</b></div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 8px', fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                Group Members ({selectedGroupDetail.members?.length || selectedGroupDetail.member_count || 1} / {selectedGroupDetail.max_group || 4})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                {selectedGroupDetail.members?.map((m) => (
                  <div
                    key={m.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      backgroundColor: m.is_leader ? '#eff6ff' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {m.name} {m.is_leader ? '👑 (Leader)' : ''}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                        Roll: <b>{m.roll}</b> {m.section ? `• Sec ${m.section}` : ''} {m.email ? `• ${m.email}` : ''}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setSelectedGroupDetail(null)}
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
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
