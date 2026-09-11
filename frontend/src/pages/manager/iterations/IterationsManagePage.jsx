import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Building2,
  GraduationCap,
  ChevronUp,
  ChevronDown,
  BarChart3,
  Layers,
  ArrowUpDown,
  Sparkles,
  ArrowRight,
  Kanban,
  Table as TableIcon,
  Check,
  ShieldCheck,
} from 'lucide-react';

const statusFilterOptions = [
  { key: 'all', label: 'All Milestones' },
  { key: 'upcoming', label: 'Active & Upcoming' },
  { key: 'needs_rubrics', label: 'Missing Rubrics' },
  { key: 'needs_attention', label: 'Needs Follow-up (<50%)' },
  { key: 'overdue', label: 'Overdue / Closed' },
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

// Human-friendly date and time formatters
const formatHumanDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const formatHumanTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-PK', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const IterationsManagePage = () => {
  const navigate = useNavigate();
  const [iterations, setIterations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);

  // Filters, Sorting & View Mode
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('deadline_asc');
  const [viewMode, setViewMode] = useState('lifecycle'); // 'lifecycle' | 'table'
  const [collapsedCompleted, setCollapsedCompleted] = useState(false);

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [showMatrix, setShowMatrix] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIteration, setEditingIteration] = useState(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [rubricIteration, setRubricIteration] = useState(null);

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

  // Executive Statistics calculation across all iterations
  const collectiveStats = useMemo(() => {
    const totalMilestones = iterations.length;
    let upcomingMilestones = 0;
    let overdueMilestones = 0;
    let totalSubmissions = 0;
    let totalExpected = 0;
    let totalLate = 0;
    let totalPending = 0;
    let withRubricsCount = 0;
    const now = new Date();

    const courseMap = {};

    iterations.forEach((item) => {
      const dl = new Date(item.deadline);
      if (dl >= now) upcomingMilestones += 1;
      else overdueMilestones += 1;

      if ((item.rubrics?.length || 0) > 0) withRubricsCount += 1;

      const stats = item.submission_stats || {};
      const tg = stats.total_groups || 0;
      const sub = stats.submitted_count || 0;
      const late = stats.late_count || 0;
      const pend = Math.max(0, tg - sub);

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
        courseMap[key].pending_count += Math.max(0, bc.total_groups - bc.submitted_count);
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
      withRubricsCount,
      missingRubricsCount: totalMilestones - withRubricsCount,
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
      if (statusFilter === 'needs_rubrics' && (item.rubrics?.length || 0) > 0) return false;
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
      if (sortBy === 'created_desc') return new Date(b.created_at || b._id) - new Date(a.created_at || a._id);
      return 0;
    });

    return result;
  }, [iterations, selectedCourse, selectedDept, statusFilter, searchQuery, sortBy]);

  // Identify the Primary Active Milestone (Nearest deadline in progress)
  const activeMilestone = useMemo(() => {
    const now = new Date();
    const upcoming = iterations
      .filter((i) => new Date(i.deadline) >= now)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    return upcoming[0] || iterations[0] || null;
  }, [iterations]);

  // Lifecycle Stages (Active / Upcoming / Completed) for human mental model
  const lifecycleStages = useMemo(() => {
    const now = new Date();
    const active = [];
    const upcoming = [];
    const completed = [];

    filteredAndSortedIterations.forEach((item) => {
      const dl = new Date(item.deadline);
      const isPast = dl < now;
      const stats = item.submission_stats || {};
      const totalGroups = stats.total_groups || 0;
      const submitted = stats.submitted_count || 0;
      const allSubmitted = totalGroups > 0 && submitted >= totalGroups;

      if (isPast || allSubmitted) {
        completed.push(item);
      } else if (active.length === 0) {
        // Nearest active milestone
        active.push(item);
      } else {
        upcoming.push(item);
      }
    });

    return { active, upcoming, completed };
  }, [filteredAndSortedIterations]);

  // Card renderer helper for Lifecycle Stages view
  const renderMilestoneCard = (item, isActive = false, isCompleted = false) => {
    const rubricCount = item.rubrics?.length || 0;
    const stats = item.submission_stats || {};
    const totalGroups = stats.total_groups || 0;
    const submitted = stats.submitted_count || 0;
    const pending = Math.max(0, totalGroups - submitted);
    const progressPct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
    const progressColor = progressPct === 100 ? '#16a34a' : progressPct >= 50 ? '#2563eb' : '#d97706';

    return (
      <div
        key={item._id}
        onClick={() => navigate(`/manager/iterations/${item._id}/submissions`)}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: isActive ? '1.5px solid #3b82f6' : '1px solid #e2e8f0',
          padding: '16px 18px',
          boxShadow: isActive ? '0 4px 12px rgba(37, 99, 235, 0.08)' : '0 1px 3px rgba(0,0,0,0.03)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          opacity: isCompleted ? 0.88 : 1,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#2563eb';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = isActive ? '#3b82f6' : '#e2e8f0';
          e.currentTarget.style.transform = 'none';
        }}
      >
        {/* Top: Scope & Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 7px',
                  borderRadius: '10px',
                  backgroundColor: item.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                  color: item.course === 'All Courses' ? '#7c3aed' : '#475569',
                  border: `1px solid ${item.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                }}
              >
                {item.course}
              </span>
              {isActive && (
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '1px 6px', borderRadius: '6px' }}>
                  ACTIVE
                </span>
              )}
              {isCompleted && (
                <span style={{ fontSize: '10.5px', fontWeight: 700, color: '#15803d', backgroundColor: '#dcfce7', padding: '1px 6px', borderRadius: '6px' }}>
                  COMPLETED
                </span>
              )}
            </div>

            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
              {item.title}
            </div>

            {item.details && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', maxWidth: '420px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.details}
              </div>
            )}
          </div>

          {/* Live Countdown Chip */}
          <DeadlineCountdown deadline={item.deadline} />
        </div>

        {/* Middle: Deadline & Rubrics */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '12px', color: '#475569', borderTop: '1px solid #f8fafc', paddingTop: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Calendar size={13} style={{ color: '#64748b' }} />
            <span>{formatHumanDate(item.deadline)}</span>
            {formatHumanTime(item.deadline) && <span style={{ color: '#94a3b8' }}>· {formatHumanTime(item.deadline)}</span>}
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 600,
              backgroundColor: rubricCount > 0 ? '#eff6ff' : '#fef3c7',
              color: rubricCount > 0 ? '#1d4ed8' : '#b45309',
              border: `1px solid ${rubricCount > 0 ? '#bfdbfe' : '#fde68a'}`,
            }}
          >
            <FileText size={11} />
            {rubricCount > 0 ? `${rubricCount} Criteria` : 'No Rubric'}
          </span>
        </div>

        {/* Progress Bar */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px', fontSize: '11.5px' }}>
            <span style={{ color: '#64748b' }}>Submissions:</span>
            <span style={{ fontWeight: 600, color: progressColor }}>
              {submitted} / {totalGroups} ({progressPct}%)
            </span>
          </div>

          <div style={{ width: '100%', height: '5px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
            <div
              style={{
                width: `${progressPct}%`,
                height: '100%',
                backgroundColor: progressColor,
                borderRadius: '3px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '3px' }}>
            <span style={{ color: pending > 0 ? '#dc2626' : '#16a34a' }}>
              {pending > 0 ? `${pending} pending` : 'All groups submitted'}
            </span>
            {stats.late_count > 0 && (
              <span style={{ color: '#d97706', fontWeight: 500 }}>
                {stats.late_count} late
              </span>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: '10px', marginTop: '2px' }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => handleOpenRubrics(item)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #bfdbfe',
                backgroundColor: '#eff6ff',
                color: '#1d4ed8',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Sliders size={12} /> Rubric
            </button>
            <button
              type="button"
              onClick={() => navigate(`/manager/iterations/${item._id}/submissions`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#f8fafc',
                color: '#334155',
                fontSize: '11.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              <Eye size={12} /> Submissions
            </button>
          </div>

          <div style={{ display: 'flex', gap: '4px' }}>
            <button
              type="button"
              onClick={() => handleEdit(item)}
              title="Edit Milestone"
              style={{
                padding: '5px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <Edit2 size={13} />
            </button>
            <button
              type="button"
              onClick={() => setIterationToDelete(item)}
              title="Delete Milestone"
              style={{
                padding: '5px',
                borderRadius: '6px',
                border: '1px solid #fecaca',
                backgroundColor: '#fff1f2',
                color: '#e11d48',
                cursor: 'pointer',
              }}
            >
              <Trash2 size={13} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1220px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Header */}
      <PageHeader
        title="Iteration Milestones & Evaluation"
        subtitle="Manage semester deliverables, student submission progress, and evaluation rubrics across academic courses."
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
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: `1px solid ${showMatrix ? '#bfdbfe' : '#cbd5e1'}`,
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            <BarChart3 size={15} />
            <span>{showMatrix ? 'Close Course Matrix' : 'Course Matrix'}</span>
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
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
              transition: 'background-color 0.15s ease',
            }}
          >
            <Plus size={16} />
            <span>Add Iteration</span>
          </button>
        </div>
      </PageHeader>

      {/* 1. Active Milestone Spotlight Banner (Executive Focus) */}
      {activeMilestone && (statusFilter === 'all' || statusFilter === 'upcoming') && !selectedCourse && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #bfdbfe',
            padding: '20px 24px',
            marginBottom: '20px',
            boxShadow: '0 4px 16px -2px rgba(37, 99, 235, 0.07), 0 2px 6px -1px rgba(0, 0, 0, 0.03)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Top Gradient Accent Bar */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '4px', background: 'linear-gradient(90deg, #2563eb, #7c3aed)' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
            {/* Left: Eyebrow + Title + Details */}
            <div style={{ flex: '1 1 340px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '11px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    backgroundColor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #dbeafe',
                  }}
                >
                  <Sparkles size={11} /> Current Active Milestone
                </span>
                <span
                  style={{
                    fontSize: '11.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: activeMilestone.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                    color: activeMilestone.course === 'All Courses' ? '#7c3aed' : '#334155',
                    border: `1px solid ${activeMilestone.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                  }}
                >
                  {activeMilestone.course}
                </span>
              </div>

              <h2 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>
                {activeMilestone.title}
              </h2>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#475569', flexWrap: 'wrap' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                  <Calendar size={14} style={{ color: '#2563eb' }} />
                  <strong>{formatHumanDate(activeMilestone.deadline)}</strong>
                  {formatHumanTime(activeMilestone.deadline) && <span>at {formatHumanTime(activeMilestone.deadline)}</span>}
                </span>
                <span>·</span>
                <DeadlineCountdown deadline={activeMilestone.deadline} />
              </div>

              {activeMilestone.details && (
                <p style={{ margin: '8px 0 0 0', fontSize: '12.5px', color: '#64748b', lineHeight: 1.4 }}>
                  {activeMilestone.details}
                </p>
              )}
            </div>

            {/* Middle: Live Progress Bar */}
            {(() => {
              const stats = activeMilestone.submission_stats || {};
              const totalGroups = stats.total_groups || 0;
              const submitted = stats.submitted_count || 0;
              const late = stats.late_count || 0;
              const pending = Math.max(0, totalGroups - submitted);
              const pct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
              const color = pct === 100 ? '#16a34a' : pct >= 50 ? '#2563eb' : '#d97706';

              return (
                <div style={{ flex: '0 1 280px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#475569' }}>
                      Deliverables Submitted
                    </span>
                    <span style={{ fontSize: '14px', fontWeight: 700, color }}>
                      {submitted} / {totalGroups} ({pct}%)
                    </span>
                  </div>

                  <div style={{ width: '100%', height: '8px', backgroundColor: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div
                      style={{
                        width: `${pct}%`,
                        height: '100%',
                        backgroundColor: color,
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', fontSize: '11.5px', color: '#64748b' }}>
                    <span>{pending} pending</span>
                    {late > 0 && <span style={{ color: '#d97706', fontWeight: 600 }}>· {late} late</span>}
                    {pct === 100 && <span style={{ color: '#16a34a', fontWeight: 600 }}>· Complete!</span>}
                  </div>
                </div>
              );
            })()}

            {/* Right: Rubric Readiness & Primary CTA */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
              {/* Rubric Badge */}
              {(() => {
                const rCount = activeMilestone.rubrics?.length || 0;
                return rCount > 0 ? (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: '#dcfce7',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                    }}
                  >
                    <Check size={13} />
                    <span>{rCount} Criteria Ready</span>
                  </span>
                ) : (
                  <span
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '12px',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: '#fef3c7',
                      color: '#b45309',
                      border: '1px solid #fde68a',
                    }}
                  >
                    <AlertTriangle size={13} />
                    <span>Missing Rubrics</span>
                  </span>
                );
              })()}

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleOpenRubrics(activeMilestone)}
                  style={{
                    padding: '7px 12px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Sliders size={13} /> Rubrics
                </button>

                <button
                  type="button"
                  onClick={() => navigate(`/manager/iterations/${activeMilestone._id}/submissions`)}
                  style={{
                    padding: '7px 14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: '#ffffff',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)',
                  }}
                >
                  <Eye size={13} /> Review Submissions <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Executive Pulse Indicators (Streamlined 3-Card Header) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Pulse 1: Semester Milestones */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Semester Milestones
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
              {collectiveStats.totalMilestones} Planned
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              {collectiveStats.upcomingMilestones} active/upcoming · {collectiveStats.overdueMilestones} closed
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#eff6ff', color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={20} />
          </div>
        </div>

        {/* Pulse 2: Submission Health */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Deliverable Compliance
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: collectiveStats.submissionRate >= 70 ? '#16a34a' : '#2563eb', marginTop: '2px' }}>
              {collectiveStats.submissionRate}% Submitted
            </div>
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
              {collectiveStats.totalSubmissions}/{collectiveStats.totalExpected} deliverables · {collectiveStats.totalLate} late
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#dcfce7', color: '#15803d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle2 size={20} />
          </div>
        </div>

        {/* Pulse 3: Rubric Evaluation Readiness */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '14px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Evaluation Readiness
            </div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: collectiveStats.missingRubricsCount === 0 ? '#16a34a' : '#d97706', marginTop: '2px' }}>
              {collectiveStats.withRubricsCount} of {collectiveStats.totalMilestones} Ready
            </div>
            <div style={{ fontSize: '11.5px', color: collectiveStats.missingRubricsCount > 0 ? '#d97706' : '#16a34a', marginTop: '2px' }}>
              {collectiveStats.missingRubricsCount > 0 ? `⚠️ ${collectiveStats.missingRubricsCount} milestone missing rubrics` : '✓ All criteria configured'}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: '#fef3c7', color: '#b45309', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={20} />
          </div>
        </div>
      </div>

      {/* 3. Collapsible Cross-Course Matrix Panel (Toggled only on request) */}
      {showMatrix && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #bfdbfe',
            padding: '18px 20px',
            marginBottom: '20px',
            boxShadow: '0 2px 8px rgba(37, 99, 235, 0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Building2 size={16} style={{ color: '#2563eb' }} />
                <span>Cross-Course & Department Submissions Matrix</span>
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                Breakdown of group deliverable compliance across individual course sections.
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowMatrix(false)}
              style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: '4px' }}
              title="Close Matrix"
            >
              <ChevronUp size={18} />
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
                    const pending = Math.max(0, row.total_groups - row.submitted_count);
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
                        <td style={{ padding: '10px 12px', color: pending > 0 ? '#dc2626' : '#94a3b8', fontWeight: pending > 0 ? 600 : 400 }}>{pending}</td>
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

      {/* 4. Streamlined Filter & View Toolbar */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.03)',
        }}
      >
        {/* Row 1: Search, Filters, and View Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Search box */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '7px 12px',
              flex: '1 1 200px',
              minWidth: '180px',
              backgroundColor: '#ffffff',
            }}
          >
            <Search size={14} style={{ color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search milestones..."
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
                padding: '7px 32px 7px 11px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: 500,
                color: '#1e293b',
                backgroundColor: '#ffffff',
                minWidth: '150px',
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
                padding: '7px 32px 7px 11px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: 500,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ArrowUpDown size={14} style={{ color: '#64748b' }} />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '7px 32px 7px 11px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '12.5px',
                fontWeight: 500,
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

          {/* Segmented View Mode Toggle (Lifecycle vs Table) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: '#f1f5f9',
              borderRadius: '8px',
              padding: '3px',
              marginLeft: 'auto',
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode('lifecycle')}
              title="Lifecycle Journey View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'lifecycle' ? '#ffffff' : 'transparent',
                color: viewMode === 'lifecycle' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'lifecycle' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <Kanban size={13} />
              <span>Stages</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              title="Compact Table View"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: viewMode === 'table' ? '#ffffff' : 'transparent',
                color: viewMode === 'table' ? '#2563eb' : '#64748b',
                boxShadow: viewMode === 'table' ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                transition: 'all 0.15s ease',
              }}
            >
              <TableIcon size={13} />
              <span>Table</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11.5px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>
            Filter:
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
          <span style={{ fontSize: '11.5px', color: '#94a3b8', marginLeft: 'auto' }}>
            Showing {filteredAndSortedIterations.length} of {iterations.length} milestones
          </span>
        </div>
      </div>

      {/* 5. Main Content Area */}
      {loading ? (
        <Preloader />
      ) : filteredAndSortedIterations.length === 0 ? (
        <EmptyState
          title="No milestones match your filters"
          message="Try changing the course filter or search query, or click 'Add Iteration' to schedule a new milestone."
        />
      ) : viewMode === 'lifecycle' ? (
        /* LIFECYCLE STAGES VIEW (Natural Real-Life Recalling) */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Stage 1: Active In-Progress */}
          {lifecycleStages.active.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#2563eb' }} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Current Active Milestone ({lifecycleStages.active.length})
                </h3>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {lifecycleStages.active.map((item) => renderMilestoneCard(item, true))}
              </div>
            </div>
          )}

          {/* Stage 2: Upcoming Milestones (Planning Ahead) */}
          {lifecycleStages.upcoming.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Upcoming Milestones ({lifecycleStages.upcoming.length})
                </h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
                {lifecycleStages.upcoming.map((item) => renderMilestoneCard(item, false))}
              </div>
            </div>
          )}

          {/* Stage 3: Completed / Closed Milestones */}
          {lifecycleStages.completed.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 4px',
                  cursor: 'pointer',
                  borderBottom: '1px solid #e2e8f0',
                  marginBottom: '12px',
                }}
                onClick={() => setCollapsedCompleted(!collapsedCompleted)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Completed / Closed Milestones ({lifecycleStages.completed.length})
                  </h3>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#64748b' }}>
                  <span>{collapsedCompleted ? 'Show archived' : 'Hide archived'}</span>
                  {collapsedCompleted ? <ChevronDown size={15} /> : <ChevronUp size={15} />}
                </div>
              </div>

              {!collapsedCompleted && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
                  {lifecycleStages.completed.map((item) => renderMilestoneCard(item, false, true))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* COMPACT TABLE VIEW (Power Scanner) */
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Iteration Milestone
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Course
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Deadline
                </th>
                <th style={{ padding: '12px 16px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase' }}>
                  Rubric Criteria
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
                const pending = Math.max(0, totalGroups - submitted);
                const progressPct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
                const progressColor = progressPct === 100 ? '#16a34a' : progressPct >= 50 ? '#2563eb' : '#dc2626';

                return (
                  <tr
                    key={item._id}
                    onClick={() => navigate(`/manager/iterations/${item._id}/submissions`)}
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
                      <div style={{ fontWeight: 600, fontSize: '13.5px', color: '#0f172a' }}>
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
                          fontSize: '11.5px',
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
                          <span>{formatHumanDate(item.deadline)}</span>
                          {formatHumanTime(item.deadline) && <span style={{ color: '#64748b' }}>at {formatHumanTime(item.deadline)}</span>}
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
                          fontSize: '11.5px',
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
                          {pending > 0 && (
                            <span style={{ color: '#dc2626' }}>
                              {pending} pending
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
                          onClick={() => navigate(`/manager/iterations/${item._id}/submissions`)}
                          title="View Submissions"
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
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#475569',
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

      {/* Iteration Form Modal (Add / Edit) */}
      <IterationFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingIteration(null);
        }}
        iteration={editingIteration}
        initialData={editingIteration}
        onSave={() => {
          fetchIterations();
          setToast({
            type: 'success',
            message: editingIteration ? 'Iteration updated successfully.' : 'Iteration created successfully.',
          });
        }}
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
        onSave={() => {
          fetchIterations();
          setToast({ type: 'success', message: 'Evaluation rubrics saved successfully.' });
        }}
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
              <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a' }}>
                Are you sure you want to delete this iteration?
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                This action will permanently remove the milestone and its configuration.
              </div>
            </div>
          </div>

          {iterationToDelete && (
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
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
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', color: '#64748b', fontSize: '12px' }}>
                <span>Course: <strong>{iterationToDelete.course}</strong></span>
                <span>Deadline: <strong>{formatHumanDate(iterationToDelete.deadline)}</strong></span>
                <span>Rubrics: <strong>{iterationToDelete.rubrics?.length || 0} criteria</strong></span>
                <span>Submissions: <strong>{iterationToDelete.submission_stats?.submitted_count || 0} groups</strong></span>
              </div>
            </div>
          )}

          {/* Submission guard warning */}
          {iterationToDelete && (iterationToDelete.submission_stats?.submitted_count || 0) > 0 ? (
            <div
              style={{
                backgroundColor: '#fff1f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#be123c',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Warning: Active Submissions Present</strong>
                <div>
                  This milestone already contains {iterationToDelete.submission_stats.submitted_count} submitted student deliverables. Deleting milestones with active student work is blocked to prevent data loss.
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                backgroundColor: '#eff6ff',
                border: '1px solid #dbeafe',
                borderRadius: '6px',
                padding: '8px 12px',
                fontSize: '11.5px',
                color: '#1e40af',
              }}
            >
              ℹ️ Safe deletion: No students have submitted work for this milestone yet.
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
                borderRadius: '6px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={deleteLoading || (iterationToDelete?.submission_stats?.submitted_count || 0) > 0}
              onClick={handleConfirmDelete}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: (iterationToDelete?.submission_stats?.submitted_count || 0) > 0 ? '#94a3b8' : '#dc2626',
                color: '#ffffff',
                borderRadius: '6px',
                cursor: deleteLoading || (iterationToDelete?.submission_stats?.submitted_count || 0) > 0 ? 'not-allowed' : 'pointer',
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
