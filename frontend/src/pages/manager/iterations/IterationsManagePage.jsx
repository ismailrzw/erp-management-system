import { useState, useEffect, useCallback, useMemo } from 'react';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { Modal } from '../../../components/ui/Modal';
import { DeadlineCountdown } from '../../../components/ui/DeadlineCountdown';
import { iterationsApi } from '../../../api/iterationsApi';
import { coursesApi } from '../../../api/coursesApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { IterationFormModal } from './IterationFormModal';
import { RubricBuilderModal } from './RubricBuilderModal';
import { IterationSubmissionsModal } from './IterationSubmissionsModal';
import {
  Plus,
  Edit2,
  Sliders,
  Trash2,
  Calendar,
  FileText,
  Eye,
  Users,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Building2,
  GraduationCap,
  ChevronUp,
  BarChart3,
  Layers,
  ArrowUpDown,
} from 'lucide-react';

const statusFilterOptions = [
  { key: 'all', label: 'All Milestones' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'needs_attention', label: 'Needs Attention (<50%)' },
];

const pillStyle = (active) => ({
  padding: '5px 14px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
  border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
  backgroundColor: active ? '#eff6ff' : '#ffffff',
  color: active ? '#1d4ed8' : '#64748b',
  transition: 'all 0.15s ease',
});

export const IterationsManagePage = () => {
  const [iterations, setIterations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters & Sorting
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline_asc');

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIteration, setEditingIteration] = useState(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [rubricIteration, setRubricIteration] = useState(null);
  const [selectedIterationForSubmissions, setSelectedIterationForSubmissions] = useState(null);

  // Delete Confirmation Modal
  const [iterationToDelete, setIterationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchFiltersData = useCallback(async () => {
    try {
      const [cRes, dRes] = await Promise.all([
        coursesApi.list(),
        departmentsApi.list({ deleted: false }),
      ]);
      const courseList = cRes.data?.items || cRes.data || [];
      const deptList = dRes.data?.items || dRes.data || [];
      setCourses(courseList);
      setDepartments(deptList);
    } catch (err) {
      console.error('Failed to load filter options:', err);
    }
  }, []);

  const fetchIterations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await iterationsApi.getAll(selectedCourse ? { course: selectedCourse } : {});
      setIterations(res.data || []);
    } catch (err) {
      setToast({ type: 'error', message: err.message || 'Failed to fetch iterations.' });
    } finally {
      setLoading(false);
    }
  }, [selectedCourse]);

  useEffect(() => {
    fetchFiltersData();
  }, [fetchFiltersData]);

  useEffect(() => {
    fetchIterations();
  }, [fetchIterations]);

  const handleCreateNew = () => {
    setEditingIteration(null);
    setIsFormOpen(true);
  };

  const handleEdit = (item) => {
    setEditingIteration(item);
    setIsFormOpen(true);
  };

  const handleOpenRubrics = (item) => {
    setRubricIteration(item);
    setIsRubricOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!iterationToDelete) return;
    setDeleteLoading(true);
    try {
      await iterationsApi.delete(iterationToDelete._id);
      setToast({ type: 'success', message: 'Iteration deleted successfully.' });
      setIterationToDelete(null);
      fetchIterations();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete iteration.';
      setToast({ type: 'error', message: msg });
    } finally {
      setDeleteLoading(false);
    }
  };

  // Collective Statistics calculation across all iterations on the page
  const collectiveStats = useMemo(() => {
    const totalMilestones = iterations.length;
    let upcomingMilestones = 0;
    let overdueMilestones = 0;
    let totalSubmissions = 0;
    let totalExpected = 0;
    let totalLate = 0;
    let totalPending = 0;
    const now = new Date();

    const courseMap = {};

    iterations.forEach((item) => {
      const dl = new Date(item.deadline);
      if (dl >= now) upcomingMilestones += 1;
      else overdueMilestones += 1;

      const stats = item.submission_stats || {};
      const tg = stats.total_groups || 0;
      const sub = stats.submitted_count || 0;
      const late = stats.late_count || 0;
      const pend = stats.pending_count !== undefined ? stats.pending_count : Math.max(0, tg - sub);

      totalExpected += tg;
      totalSubmissions += sub;
      totalLate += late;
      totalPending += pend;

      // Aggregate cross-course breakdown
      (stats.by_course || []).forEach((bc) => {
        const key = `${bc.course}__${bc.dept}`;
        if (!courseMap[key]) {
          courseMap[key] = {
            course: bc.course,
            dept: bc.dept,
            total_groups: bc.total_groups,
            submitted_count: 0,
            late_count: 0,
            pending_count: 0,
          };
        }
        courseMap[key].submitted_count += bc.submitted_count;
        courseMap[key].late_count += bc.late_count;
        courseMap[key].pending_count += bc.pending_count;
      });
    });

    const submissionRate =
      totalExpected > 0 ? Math.round((totalSubmissions / totalExpected) * 100) : 0;
    const onTimeSubmissions = Math.max(0, totalSubmissions - totalLate);

    return {
      totalMilestones,
      upcomingMilestones,
      overdueMilestones,
      totalExpected,
      totalSubmissions,
      onTimeSubmissions,
      totalLate,
      totalPending,
      submissionRate,
      courseBreakdown: Object.values(courseMap),
    };
  }, [iterations]);

  // Apply filters and sorting
  const filteredAndSortedIterations = useMemo(() => {
    const now = new Date();
    const result = iterations.filter((item) => {
      // Course filter
      if (selectedCourse && item.course !== selectedCourse && item.course !== 'All Courses') {
        return false;
      }

      // Department filter
      if (selectedDept) {
        const byCourse = item.submission_stats?.by_course || [];
        const hasDept = byCourse.some((bc) => bc.dept === selectedDept);
        if (!hasDept) return false;
      }

      // Status filter
      const dl = new Date(item.deadline);
      if (statusFilter === 'upcoming' && dl < now) return false;
      if (statusFilter === 'overdue' && dl >= now) return false;
      if (statusFilter === 'needs_attention') {
        const stats = item.submission_stats || {};
        const pct = stats.total_groups > 0 ? (stats.submitted_count / stats.total_groups) * 100 : 0;
        if (pct >= 50 && dl >= now) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDetails = item.details?.toLowerCase().includes(q);
        const matchesCourse = item.course?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDetails && !matchesCourse) return false;
      }

      return true;
    });

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'deadline_asc') return new Date(a.deadline) - new Date(b.deadline);
      if (sortBy === 'deadline_desc') return new Date(b.deadline) - new Date(a.deadline);
      if (sortBy === 'rate_desc') {
        const rateA = a.submission_stats?.total_groups > 0 ? a.submission_stats.submitted_count / a.submission_stats.total_groups : 0;
        const rateB = b.submission_stats?.total_groups > 0 ? b.submission_stats.submitted_count / b.submission_stats.total_groups : 0;
        return rateB - rateA;
      }
      if (sortBy === 'rate_asc') {
        const rateA = a.submission_stats?.total_groups > 0 ? a.submission_stats.submitted_count / a.submission_stats.total_groups : 0;
        const rateB = b.submission_stats?.total_groups > 0 ? b.submission_stats.submitted_count / b.submission_stats.total_groups : 0;
        return rateA - rateB;
      }
      if (sortBy === 'title_asc') return (a.title || '').localeCompare(b.title || '');
      if (sortBy === 'created_desc') return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      return 0;
    });

    return result;
  }, [iterations, selectedCourse, selectedDept, statusFilter, searchQuery, sortBy]);

  return (
    <div style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Iteration Milestones & Submissions"
        subtitle="Manage FYP iterations, rubrics, and track collective submission progress across courses & departments."
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setShowMatrix(!showMatrix)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: showMatrix ? '#eff6ff' : '#ffffff',
              color: showMatrix ? '#1d4ed8' : '#475569',
              padding: '8px 14px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              border: `1px solid ${showMatrix ? '#bfdbfe' : '#cbd5e1'}`,
              cursor: 'pointer',
            }}
          >
            <BarChart3 size={15} />
            <span>{showMatrix ? 'Hide Cross-Course Matrix' : 'Cross-Course Matrix'}</span>
          </button>

          <button
            type="button"
            onClick={handleCreateNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Plus size={16} />
            <span>Add Iteration</span>
          </button>
        </div>
      </PageHeader>

      {/* Collective Statistics KPI Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Card 1: Milestones */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Total Milestones
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {collectiveStats.totalMilestones}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {collectiveStats.upcomingMilestones} upcoming · {collectiveStats.overdueMilestones} overdue
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
        </div>

        {/* Card 2: Tracked Deliverables */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Tracked Deliverables
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {collectiveStats.totalExpected}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              Across {collectiveStats.courseBreakdown.length} course sections
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#f5f3ff', color: '#7c3aed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Users size={20} />
          </div>
        </div>

        {/* Card 3: Collective Submission Rate */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Overall Submission Rate
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: collectiveStats.submissionRate >= 80 ? '#16a34a' : collectiveStats.submissionRate >= 50 ? '#2563eb' : '#dc2626', marginTop: '2px' }}>
              {collectiveStats.submissionRate}%
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
              {collectiveStats.totalSubmissions} / {collectiveStats.totalExpected} submitted
            </div>
            {collectiveStats.totalExpected > 0 && (
              <div style={{ width: '85%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                <div style={{ width: `${collectiveStats.submissionRate}%`, height: '100%', backgroundColor: collectiveStats.submissionRate >= 80 ? '#16a34a' : '#2563eb', borderRadius: '2px' }} />
              </div>
            )}
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Card 4: On-Time vs Late */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              On-Time vs Late
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '2px' }}>
              <span style={{ fontSize: '22px', fontWeight: 700, color: '#16a34a' }}>
                {collectiveStats.onTimeSubmissions}
              </span>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>/</span>
              <span style={{ fontSize: '16px', fontWeight: 700, color: '#d97706' }}>
                {collectiveStats.totalLate} late
              </span>
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {collectiveStats.totalSubmissions > 0 ? Math.round((collectiveStats.onTimeSubmissions / collectiveStats.totalSubmissions) * 100) : 0}% on-time compliance
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={20} />
          </div>
        </div>

        {/* Card 5: Pending Submissions */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '14px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div>
            <div style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
              Pending Deliverables
            </div>
            <div style={{ fontSize: '22px', fontWeight: 700, color: collectiveStats.totalPending > 0 ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
              {collectiveStats.totalPending}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
              {collectiveStats.totalPending > 0 ? 'Requires student attention' : 'All groups submitted!'}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <XCircle size={20} />
          </div>
        </div>
      </div>

      {/* Cross-Course & Cross-Department Overview Matrix (Collapsible Panel) */}
      {showMatrix && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            padding: '16px 18px',
            marginBottom: '20px',
            boxShadow: '0 2px 6px rgba(37, 99, 235, 0.06)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} style={{ color: '#2563eb' }} />
                <span>Cross-Course & Cross-Department Submissions Matrix</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                High-level oversight of group compliance across all registered courses and academic departments.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMatrix(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
            >
              <ChevronUp size={16} />
            </button>
          </div>

          {collectiveStats.courseBreakdown.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              No course group statistics available yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12.5px' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Course</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Department</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Groups</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Submitted</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>On-Time</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Late</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Pending</th>
                    <th style={{ padding: '8px 12px', fontWeight: 600, color: '#475569' }}>Completion</th>
                  </tr>
                </thead>
                <tbody>
                  {collectiveStats.courseBreakdown.map((row, idx) => {
                    const pct = row.total_groups > 0 ? Math.round((row.submitted_count / row.total_groups) * 100) : 0;
                    const onTime = Math.max(0, row.submitted_count - row.late_count);
                    const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#dc2626';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{row.course}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, padding: '2px 7px', borderRadius: '6px', backgroundColor: '#f1f5f9', color: '#475569' }}>
                            {row.dept}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: '#475569' }}>{row.total_groups}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: '#0f172a' }}>{row.submitted_count}</td>
                        <td style={{ padding: '10px 12px', color: '#16a34a' }}>{onTime}</td>
                        <td style={{ padding: '10px 12px', color: row.late_count > 0 ? '#d97706' : '#94a3b8' }}>{row.late_count}</td>
                        <td style={{ padding: '10px 12px', color: row.pending_count > 0 ? '#dc2626' : '#94a3b8', fontWeight: row.pending_count > 0 ? 600 : 400 }}>{row.pending_count}</td>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, color, minWidth: '35px' }}>{pct}%</span>
                            <div style={{ width: '70px', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '2.5px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', backgroundColor: color, borderRadius: '2.5px' }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Filter & Sorting Toolbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        {/* Row 1: Search and Dropdowns */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              padding: '6px 12px',
              flex: '1 1 220px',
              minWidth: '200px',
              backgroundColor: '#ffffff',
            }}
          >
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search milestones or courses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                fontSize: '13px',
                color: '#1e293b',
                width: '100%',
              }}
            />
          </div>

          {/* Course filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <GraduationCap size={14} style={{ color: '#64748b' }} />
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                minWidth: '160px',
              }}
            >
              <option value="">All Courses</option>
              {courses.map((c) => (
                <option key={c._id || c.id || c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Department filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={14} style={{ color: '#64748b' }} />
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#1e293b',
                backgroundColor: '#ffffff',
                minWidth: '140px',
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id || d.id || d.name} value={d.code || d.name}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
            <ArrowUpDown size={14} style={{ color: '#64748b' }} />
            <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                color: '#1e293b',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="deadline_asc">Deadline (Soonest)</option>
              <option value="deadline_desc">Deadline (Furthest)</option>
              <option value="rate_desc">Submission Rate (High to Low)</option>
              <option value="rate_asc">Submission Rate (Low to High)</option>
              <option value="title_asc">Title (A–Z)</option>
              <option value="created_desc">Recently Created</option>
            </select>
          </div>
        </div>

        {/* Row 2: Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
            Status:
          </span>
          {statusFilterOptions.map((opt) => (
            <button
              type="button"
              key={opt.key}
              onClick={() => setStatusFilter(opt.key)}
              style={pillStyle(statusFilter === opt.key)}
            >
              {opt.label}
            </button>
          ))}
          <span style={{ fontSize: '12px', color: '#94a3b8', marginLeft: 'auto' }}>
            Showing <strong>{filteredAndSortedIterations.length}</strong> of {iterations.length} milestones
          </span>
        </div>
      </div>

      {/* Iterations Table or Empty State */}
      {loading ? (
        <Preloader label="Loading iterations..." />
      ) : filteredAndSortedIterations.length === 0 ? (
        <EmptyState
          title="No Iterations Found"
          description={
            searchQuery || selectedCourse || selectedDept || statusFilter !== 'all'
              ? 'No iteration milestones match the selected filters.'
              : 'No iteration milestones configured yet.'
          }
          actionLabel="Create Iteration"
          onAction={handleCreateNew}
        />
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Iteration Title & Details
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Course
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Deadline
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Rubrics
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Submissions
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textAlign: 'right', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedIterations.map((item) => {
                const rubricCount = item.rubrics?.length || 0;
                const stats = item.submission_stats || {};
                const totalGroups = stats.total_groups || 0;
                const submitted = stats.submitted_count || 0;
                const progressPct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
                const progressColor = progressPct === 100 ? '#16a34a' : progressPct >= 50 ? '#2563eb' : '#dc2626';

                return (
                  <tr
                    key={item._id}
                    onClick={() => setSelectedIterationForSubmissions(item)}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      cursor: 'pointer',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#ffffff';
                    }}
                  >
                    {/* Title */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                        {item.title}
                      </div>
                      {item.details && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: '#64748b',
                            marginTop: '2px',
                            maxWidth: '260px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {item.details}
                        </div>
                      )}
                    </td>

                    {/* Course */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '12px',
                          backgroundColor: item.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                          color: item.course === 'All Courses' ? '#7c3aed' : '#334155',
                          border: `1px solid ${item.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                        }}
                      >
                        {item.course}
                      </span>
                    </td>

                    {/* Deadline with Live Countdown */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '12.5px', color: '#0f172a', fontWeight: 500 }}>
                          <Calendar size={13} style={{ color: '#64748b' }} />
                          <span>{item.deadline}</span>
                        </div>
                        <DeadlineCountdown deadline={item.deadline} />
                      </div>
                    </td>

                    {/* Rubrics */}
                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          backgroundColor: rubricCount > 0 ? '#eff6ff' : '#fef3c7',
                          color: rubricCount > 0 ? '#1d4ed8' : '#b45309',
                          border: `1px solid ${rubricCount > 0 ? '#bfdbfe' : '#fde68a'}`,
                        }}
                      >
                        <FileText size={12} />
                        <span>{rubricCount} Criteria</span>
                      </span>
                    </td>

                    {/* Submissions Progress */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: '130px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} style={{ color: '#64748b' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: progressColor }}>
                            {submitted}/{totalGroups}
                          </span>
                          <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                            ({progressPct}%)
                          </span>
                        </div>
                        {totalGroups > 0 && (
                          <div style={{ width: '100%', height: '4px', backgroundColor: '#f1f5f9', borderRadius: '2px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: `${progressPct}%`,
                                height: '100%',
                                backgroundColor: progressColor,
                                borderRadius: '2px',
                                transition: 'width 0.3s ease',
                              }}
                            />
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', fontSize: '11px' }}>
                          {stats.late_count > 0 && (
                            <span style={{ color: '#d97706', fontWeight: 500 }}>
                              {stats.late_count} late
                            </span>
                          )}
                          {stats.pending_count > 0 && (
                            <span style={{ color: '#dc2626' }}>
                              {stats.pending_count} pending
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Action Buttons */}
                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div
                        style={{ display: 'inline-flex', gap: '6px' }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSelectedIterationForSubmissions(item)}
                          title="View Submissions Drill-Down"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#f8fafc',
                            color: '#334155',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Eye size={13} />
                          <span>Submissions</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenRubrics(item)}
                          title="Build Rubric"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #bfdbfe',
                            backgroundColor: '#eff6ff',
                            color: '#1d4ed8',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <Sliders size={13} />
                          <span>Rubric</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          title="Edit Iteration"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #e2e8f0',
                            backgroundColor: '#ffffff',
                            color: '#64748b',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Edit2 size={13} />
                        </button>

                        <button
                          type="button"
                          onClick={() => setIterationToDelete(item)}
                          title="Delete Iteration"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fff1f2',
                            color: '#e11d48',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Submissions Detail Modal (Opened on click) */}
      <IterationSubmissionsModal
        isOpen={!!selectedIterationForSubmissions}
        onClose={() => setSelectedIterationForSubmissions(null)}
        iteration={selectedIterationForSubmissions}
      />

      {/* Iteration Form Modal (Add / Edit) */}
      <IterationFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingIteration(null);
        }}
        iteration={editingIteration}
        onSuccess={() => {
          fetchIterations();
          setToast({
            type: 'success',
            message: editingIteration ? 'Iteration updated successfully.' : 'Iteration created successfully.',
          });
        }}
        courses={courses}
      />

      {/* Rubric Builder Modal */}
      <RubricBuilderModal
        isOpen={isRubricOpen}
        onClose={() => {
          setIsRubricOpen(false);
          setRubricIteration(null);
        }}
        iteration={rubricIteration}
        onSuccess={() => {
          fetchIterations();
          setToast({ type: 'success', message: 'Evaluation rubrics saved successfully.' });
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!iterationToDelete}
        onClose={() => !deleteLoading && setIterationToDelete(null)}
        title="Delete Iteration Milestone"
        maxWidth="460px"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a' }}>
                Are you sure you want to delete this iteration?
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                This action is permanent and cannot be undone.
              </div>
            </div>
          </div>

          {iterationToDelete && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '12px 14px',
                fontSize: '13px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1e293b' }}>
                {iterationToDelete.title}
              </div>
              <div style={{ display: 'flex', gap: '12px', color: '#64748b', fontSize: '12px', flexWrap: 'wrap' }}>
                <span>Course: <strong>{iterationToDelete.course}</strong></span>
                <span>Deadline: <strong>{iterationToDelete.deadline}</strong></span>
                <span>Criteria: <strong>{iterationToDelete.rubrics?.length || 0}</strong></span>
              </div>
            </div>
          )}

          {iterationToDelete?.submission_stats?.submitted_count > 0 ? (
            <div
              style={{
                backgroundColor: '#fffbeb',
                border: '1px solid #fef3c7',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#b45309',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Deletion Guard:</strong> {iterationToDelete.submission_stats.submitted_count} student submission(s) have been received. Iterations with existing student deliverables cannot be deleted to prevent data loss.
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: '#16a34a' }}>
              ✓ No student submissions exist for this iteration. It can be safely deleted.
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
            <button
              type="button"
              disabled={deleteLoading}
              onClick={() => setIterationToDelete(null)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading || (iterationToDelete?.submission_stats?.submitted_count > 0)}
              onClick={handleConfirmDelete}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: iterationToDelete?.submission_stats?.submitted_count > 0 ? '#94a3b8' : '#dc2626',
                color: '#ffffff',
                borderRadius: '4px',
                cursor: deleteLoading || iterationToDelete?.submission_stats?.submitted_count > 0 ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Trash2 size={14} />
              <span>{deleteLoading ? 'Deleting...' : 'Delete Iteration'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
