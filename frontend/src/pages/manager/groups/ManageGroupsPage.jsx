import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  FolderGit2,
  CheckCircle2,
  XCircle,
  Eye,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Download,
  FileText,
  UserCheck,
  UserX,
  Mail,
  Send,
} from 'lucide-react';
import { managerGroupsApi } from '../../../api/managerGroupsApi';
import { studentsApi } from '../../../api/studentsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { coursesApi } from '../../../api/coursesApi';
import { reportsApi } from '../../../api/reportsApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { formatDate } from '../../../utils/dateUtils';

export const ManageGroupsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'all';

  const [groups, setGroups] = useState([]);
  const [counts, setCounts] = useState({ all: 0, pending: 0, approved: 0, rejected: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters
  const [statusFilter, setStatusFilter] = useState(initialTab);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');

  // Dropdowns reference data
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);

  // Ungrouped Students State
  const [ungroupedStudents, setUngroupedStudents] = useState([]);
  const [ungroupedCount, setUngroupedCount] = useState(0);
  const [ungroupedLoading, setUngroupedLoading] = useState(false);
  const [ungroupedDept, setUngroupedDept] = useState('');
  const [ungroupedCourse, setUngroupedCourse] = useState('');
  const [ungroupedSearch, setUngroupedSearch] = useState('');
  const [isNotifyModalOpen, setIsNotifyModalOpen] = useState(false);
  const [notifyCustomMessage, setNotifyCustomMessage] = useState('');
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);

  // Modals
  const [groupToApprove, setGroupToApprove] = useState(null);
  const [groupToReject, setGroupToReject] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedGroupDetail, setSelectedGroupDetail] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectError, setRejectError] = useState('');

  // Sync tab with URL search params
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['all', 'pending', 'approved', 'rejected', 'ungrouped'].includes(tab)) {
      setStatusFilter(tab);
    } else if (!tab) {
      setStatusFilter('all');
    }
  }, [searchParams]);

  const handleTabChange = (newTab) => {
    setStatusFilter(newTab);
    if (newTab === 'all') {
      setSearchParams({});
    } else {
      setSearchParams({ tab: newTab });
    }
  };

  const fetchGroups = useCallback(
    async (page = 1, isRefresh = false) => {
      if (statusFilter === 'ungrouped') return;
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

  const fetchUngroupedStudents = useCallback(
    async (isInitialCountOnly = false) => {
      try {
        if (!isInitialCountOnly) setUngroupedLoading(true);
        const params = {
          dept: ungroupedDept || undefined,
          course: ungroupedCourse || undefined,
        };
        const res = await studentsApi.getUngrouped(params);
        if (res.success && res.data) {
          const items = Array.isArray(res.data)
            ? res.data
            : Array.isArray(res.data.items)
              ? res.data.items
              : [];
          setUngroupedStudents(items);
          setUngroupedCount(res.data.total ?? items.length);
        }
      } catch (err) {
        if (!isInitialCountOnly) {
          setToast({
            message: err.response?.data?.message || 'Failed to load ungrouped students',
            type: 'error',
          });
        }
      } finally {
        if (!isInitialCountOnly) setUngroupedLoading(false);
      }
    },
    [ungroupedDept, ungroupedCourse]
  );

  // Initial fetch for count
  useEffect(() => {
    fetchUngroupedStudents(true);
  }, [fetchUngroupedStudents]);

  // Handle active tab switches
  useEffect(() => {
    if (statusFilter === 'ungrouped') {
      setLoading(false);
      fetchUngroupedStudents(false);
    } else {
      fetchGroups(1);
    }
  }, [statusFilter, fetchGroups, fetchUngroupedStudents]);

  // Load dropdown options once
  useEffect(() => {
    const loadFilters = async () => {
      try {
        const [deptRes, courseRes] = await Promise.all([
          departmentsApi.list({ limit: 100, deleted: false }),
          coursesApi.list({ limit: 100, deleted: false }),
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

  // Ungrouped Export & Notify Handlers
  const handleExportUngrouped = async () => {
    try {
      setExportLoading(true);
      const params = {
        dept: ungroupedDept || undefined,
        course: ungroupedCourse || undefined,
      };
      const response = await studentsApi.exportUngrouped(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `ungrouped_students_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast({ message: 'Ungrouped students spreadsheet downloaded.', type: 'success' });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to export ungrouped students',
        type: 'error',
      });
    } finally {
      setExportLoading(false);
    }
  };

  const handleSendUngroupedNotification = async (e) => {
    e.preventDefault();
    try {
      setNotifyLoading(true);
      const res = await studentsApi.notifyUngrouped({
        dept: ungroupedDept || undefined,
        course: ungroupedCourse || undefined,
        message: notifyCustomMessage.trim() || undefined,
      });
      if (res.success) {
        setToast({
          message: `Successfully notified ${res.data?.sent_count || 0} student(s) via email.`,
          type: 'success',
        });
        setIsNotifyModalOpen(false);
        setNotifyCustomMessage('');
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to send notification emails',
        type: 'error',
      });
    } finally {
      setNotifyLoading(false);
    }
  };

  // Filtered Ungrouped Students for Search
  const filteredUngrouped = ungroupedStudents.filter((s) => {
    if (!ungroupedSearch.trim()) return true;
    const term = ungroupedSearch.toLowerCase();
    return (
      (s.roll && s.roll.toLowerCase().includes(term)) ||
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.email && s.email.toLowerCase().includes(term)) ||
      (s.section && s.section.toLowerCase().includes(term)) ||
      (s.dept && s.dept.toLowerCase().includes(term)) ||
      (s.course && s.course.toLowerCase().includes(term))
    );
  });

  const handleDownloadReport = async () => {
    try {
      setDownloadingReport(true);
      const params = {
        dept: selectedDept || undefined,
        course: selectedCourse || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
      };
      const response = await reportsApi.downloadGroupReport(params);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `group_report_${new Date().toISOString().slice(0, 10)}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      setToast({ message: 'Group report Excel file downloaded successfully.', type: 'success' });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to download report',
        type: 'error',
      });
    } finally {
      setDownloadingReport(false);
    }
  };

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

  const renderFormationBadge = (st) => {
    if (st === 'on_time') {
      return (
        <span style={{ backgroundColor: '#ecfdf5', color: '#047857', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
          On Time
        </span>
      );
    }
    if (st === 'on_deadline') {
      return (
        <span style={{ backgroundColor: '#fef3c7', color: '#b45309', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
          On Deadline
        </span>
      );
    }
    if (st === 'late') {
      return (
        <span style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
          Late
        </span>
      );
    }
    return (
      <span style={{ color: '#94a3b8', fontSize: '11.5px' }}>
        -
      </span>
    );
  };

  const renderSubmissionBadge = (st) => {
    if (st === 'submitted') {
      return (
        <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600 }}>
          Submitted
        </span>
      );
    }
    return (
      <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 500 }}>
        Not Submitted
      </span>
    );
  };

  if (loading && !refreshing && groups.length === 0 && ungroupedStudents.length === 0) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Manage Project Groups"
          subtitle="Review, approve, or provide revision feedback on student group formation requests."
        />
        <ContentLoader label="Loading project groups..." />
      </div>
    );
  }

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
        title="Manage Project Groups"
        subtitle="Review, approve, or provide revision feedback on student group formation requests."
      >
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {statusFilter === 'ungrouped' ? (
            <button
              type="button"
              onClick={handleExportUngrouped}
              disabled={exportLoading}
              className="btn btn-primary"
            >
              {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Export Ungrouped Excel</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleDownloadReport}
              disabled={downloadingReport}
              className="btn btn-primary"
            >
              {downloadingReport ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              <span>Download Group Report</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              if (statusFilter === 'ungrouped') {
                fetchUngroupedStudents(false);
              } else {
                fetchGroups(pagination.page, true);
              }
            }}
            disabled={refreshing || ungroupedLoading}
            className="btn btn-ghost btn-sm"
          >
            <RefreshCw size={14} className={refreshing || ungroupedLoading ? 'animate-spin' : ''} />
            <span>{refreshing || ungroupedLoading ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </PageHeader>

      {/* Status Counters Tab Bar */}
      <div
        className="scrollable-tabs-bar"
        style={{
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          onClick={() => handleTabChange('all')}
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
          onClick={() => handleTabChange('pending')}
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
          onClick={() => handleTabChange('approved')}
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
          onClick={() => handleTabChange('rejected')}
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

        <button
          type="button"
          onClick={() => handleTabChange('ungrouped')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 16px',
            fontSize: '13.5px',
            fontWeight: statusFilter === 'ungrouped' ? 700 : 500,
            color: statusFilter === 'ungrouped' ? '#d97706' : '#64748b',
            border: 'none',
            borderBottom: statusFilter === 'ungrouped' ? '3px solid #d97706' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <UserX size={15} />
          <span>Ungrouped Students</span>
          <span
            style={{
              padding: '2px 7px',
              borderRadius: '10px',
              backgroundColor: ungroupedCount > 0 ? '#fef3c7' : '#f1f5f9',
              color: ungroupedCount > 0 ? '#b45309' : '#64748b',
              fontSize: '11px',
              fontWeight: 700,
            }}
          >
            {ungroupedCount}
          </span>
        </button>
      </div>

      {statusFilter === 'ungrouped' ? (
        /* Ungrouped Students Management View */
        <div>
          {/* Toolbar Filters & Action Buttons */}
          <div
            className="toolbar-responsive"
            style={{
              backgroundColor: '#ffffff',
              padding: '14px 18px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '18px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            <div className="toolbar-group-left" style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap', flex: 1 }}>
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
                  value={ungroupedSearch}
                  onChange={(e) => setUngroupedSearch(e.target.value)}
                  placeholder="Search roll, name, email..."
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
                value={ungroupedDept}
                onChange={(e) => setUngroupedDept(e.target.value)}
                style={{
                  padding: '8px 32px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => {
                  const val = d.code || d.name || '';
                  const label = d.code && d.name ? `${d.code} - ${d.name}` : (d.name || d.code);
                  return (
                    <option key={d.id || d._id || val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <select
                value={ungroupedCourse}
                onChange={(e) => setUngroupedCourse(e.target.value)}
                style={{
                  padding: '8px 32px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                }}
              >
                <option value="">All Courses</option>
                {courses.map((c) => {
                  const val = c.name || '';
                  const label = c.dept ? `${c.name} (${c.dept})` : c.name;
                  return (
                    <option key={c.id || c._id || val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={handleExportUngrouped}
                disabled={exportLoading}
                className="btn btn-secondary btn-sm"
              >
                {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                <span>Export Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsNotifyModalOpen(true)}
                disabled={filteredUngrouped.length === 0}
                className="btn btn-primary btn-sm"
              >
                <Mail size={14} />
                <span>Notify via Email</span>
              </button>
            </div>
          </div>

          {/* Ungrouped Students Table Card */}
          <div className="card-responsive" style={{ padding: 0, overflow: 'hidden' }}>
            {ungroupedLoading ? (
              <ContentLoader label="Loading ungrouped students..." />
            ) : filteredUngrouped.length === 0 ? (
              <EmptyState
                icon={UserX}
                title="No ungrouped students found"
                description={
                  ungroupedSearch || ungroupedDept || ungroupedCourse
                    ? 'No ungrouped students match the active filter or search query.'
                    : 'All students in the selected criteria have formed or joined groups.'
                }
              />
            ) : (
              <div className="table-responsive-container table-wide">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '100px' }}>ROLL NO</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '130px' }}>STUDENT NAME</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '100px' }}>DEPARTMENT</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '80px' }}>SECTION</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '130px' }}>COURSE</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '160px' }}>EMAIL</th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '80px' }}>STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUngrouped.map((s) => (
                      <tr
                        key={s.id || s._id || s.roll}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0073aa', fontSize: '13px' }}>
                          {s.roll}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b', fontSize: '13px' }}>
                          {s.name}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              backgroundColor: '#eef6fb',
                              color: '#0073aa',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            {s.dept || 'CS'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                          {s.section || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontSize: '13px' }}>
                          {s.course || '-'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px' }}>
                          {s.email}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span
                            style={{
                              backgroundColor: '#fef3c7',
                              color: '#b45309',
                              padding: '3px 9px',
                              borderRadius: '10px',
                              fontSize: '11px',
                              fontWeight: 600,
                            }}
                          >
                            Ungrouped
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {!ungroupedLoading && filteredUngrouped.length > 0 && (
              <div
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  fontSize: '12.5px',
                  color: '#64748b',
                }}
              >
                Showing {filteredUngrouped.length} ungrouped student{filteredUngrouped.length === 1 ? '' : 's'}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Standard Groups View */
        <>
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
                  padding: '8px 32px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                }}
              >
                <option value="">All Departments</option>
                {departments.map((d) => {
                  const val = d.name || d.code || '';
                  const label = d.name && d.code ? `${d.name} (${d.code})` : (d.name || d.code);
                  return (
                    <option key={d.id || d._id || val} value={val}>
                      {label}
                    </option>
                  );
                })}
              </select>

              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                style={{
                  padding: '8px 32px 8px 12px',
                  fontSize: '13px',
                  fontWeight: 500,
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                }}
              >
                <option value="">All Courses</option>
                {courses.map((c) => {
                  const val = c.name || '';
                  const label = c.dept ? `${c.name} (${c.dept})` : c.name;
                  return (
                    <option key={c.id || c._id || val} value={val}>
                      {label}
                    </option>
                  );
                })}
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
              <div className="table-responsive-container table-wide">
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '160px' }}>
                        GROUP / PROJECT
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '150px' }}>
                        LEADER & SUPERVISOR
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', minWidth: '130px' }}>
                        COURSE & DEPT
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        FORMATION
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        SUBMISSION
                      </th>
                      <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                        STATUS
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
                      >
                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>
                            {g.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                            {g.project_title || 'Untitled Project'}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#334155' }}>
                            {g.leader_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {g.leader_roll}
                          </div>
                          {g.supervisor_name && (
                            <div style={{ fontSize: '11.5px', color: '#0073aa', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <UserCheck size={11} />
                              <span>Sup: {g.supervisor_name}</span>
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <div style={{ fontSize: '13px', color: '#334155' }}>
                            {g.course_name}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                            {g.dept}
                          </div>
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {renderFormationBadge(g.formation_status)}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          {renderSubmissionBadge(g.submission_status)}
                        </td>

                        <td style={{ padding: '14px 16px' }}>
                          <StatusBadge status={g.status} />
                        </td>

                        <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(g)}
                              className="btn btn-ghost btn-sm"
                              title="View group details"
                            >
                              <Eye size={13} />
                              <span>View</span>
                            </button>

                            {g.status === 'pending' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setGroupToApprove(g)}
                                  className="btn btn-success btn-sm"
                                  title="Approve this group"
                                >
                                  <CheckCircle2 size={13} />
                                  <span>Approve</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setGroupToReject(g);
                                    setRejectionReason('');
                                    setRejectError('');
                                  }}
                                  className="btn btn-danger-outline btn-sm"
                                  title="Reject group with feedback"
                                >
                                  <XCircle size={13} />
                                  <span>Reject</span>
                                </button>
                              </>
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
                    className="btn btn-secondary btn-sm"
                  >
                    <ChevronLeft size={14} />
                    <span>Prev</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => fetchGroups(pagination.page + 1)}
                    disabled={pagination.page >= pagination.pages}
                    className="btn btn-secondary btn-sm"
                  >
                    <span>Next</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

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
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApprove}
              disabled={actionLoading}
              className="btn btn-success"
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
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn btn-danger"
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
              <div>Supervisor: <b>{selectedGroupDetail.supervisor_name || 'Not Assigned'}</b></div>
              <div>Formation: <b>{selectedGroupDetail.formation_status === 'on_time' ? 'On Time' : selectedGroupDetail.formation_status === 'on_deadline' ? 'On Deadline' : selectedGroupDetail.formation_status === 'late' ? 'Late' : 'N/A'}</b></div>
              <div>Submission: <b>{selectedGroupDetail.submission_status === 'submitted' ? 'Submitted' : 'Not Submitted'}</b></div>
              <div>Created: <b>{formatDate(selectedGroupDetail.created_at)}</b></div>
            </div>

            {/* Proposal Document Link if attached */}
            {selectedGroupDetail.proposal_download_url && (
              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f0f9ff',
                  border: '1px solid #bae6fd',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#0369a1' }}>
                  <FileText size={18} />
                  <span><strong>Project Proposal Document</strong> attached</span>
                </div>
                <a
                  href={selectedGroupDetail.proposal_download_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '6px 12px',
                    backgroundColor: '#0073aa',
                    color: '#ffffff',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  <Download size={13} />
                  <span>Download Proposal</span>
                </a>
              </div>
            )}

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
                      backgroundColor: m.is_leader ? 'var(--primary-light)' : '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '6px',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {m.name} {m.is_leader ? '(Leader)' : ''}
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
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Notify Ungrouped Students Email */}
      <Modal
        isOpen={isNotifyModalOpen}
        onClose={() => setIsNotifyModalOpen(false)}
        title="Email Reminder to Ungrouped Students"
        maxWidth="520px"
      >
        <form onSubmit={handleSendUngroupedNotification}>
          <div style={{ marginBottom: '14px', fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            You are about to dispatch an email notification to{' '}
            <strong>{filteredUngrouped.length} ungrouped student(s)</strong> reminding them to complete their group formation before the course deadline.
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Custom Note / Message (Optional)
            </label>
            <textarea
              rows={3}
              value={notifyCustomMessage}
              onChange={(e) => setNotifyCustomMessage(e.target.value)}
              placeholder="e.g. Please note that groups created after the deadline will be marked as late submissions."
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsNotifyModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={notifyLoading || filteredUngrouped.length === 0}
              className="btn btn-primary"
            >
              {notifyLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{notifyLoading ? 'Sending Emails...' : 'Send Notification'}</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
