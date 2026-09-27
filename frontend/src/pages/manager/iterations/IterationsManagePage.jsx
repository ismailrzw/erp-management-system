import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/ui/EmptyState';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { Toast } from '../../../components/ui/Toast';
import { Modal } from '../../../components/ui/Modal';
import { PageHeader } from '../../../components/ui/PageHeader';
import { iterationsApi } from '../../../api/iterationsApi';
import { sprintsApi } from '../../../api/sprintsApi';
import { coursesApi } from '../../../api/coursesApi';
import { IterationFormModal } from './IterationFormModal';
import { RubricBuilderModal } from './RubricBuilderModal';
import { IterationsTabBar } from './IterationsTabBar';
import {
  Plus,
  Edit2,
  Sliders,
  Trash2,
  Calendar,
  Eye,
  Search,
  CheckCircle2,
  Layers,
  FileText,
} from 'lucide-react';

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
  const [sprints, setSprints] = useState([]);
  const [courses, setCourses] = useState([]);

  // Filters & State
  const [selectedCourse, setSelectedCourse] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all' | 'active' | 'completed'

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIteration, setEditingIteration] = useState(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [rubricIteration, setRubricIteration] = useState(null);

  // Sprint Creation Modal State
  const [isCreateSprintOpen, setIsCreateSprintOpen] = useState(false);
  const [sprintFormData, setSprintFormData] = useState({ name: '', description: '' });
  const [sprintActionLoading, setSprintActionLoading] = useState(false);

  // Delete Confirmation Modals
  const [iterationToDelete, setIterationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sprintToDelete, setSprintToDelete] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await coursesApi.list();
      const courseList = res.data?.items || res.data || [];
      setCourses(courseList);
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, []);

  const fetchSprints = useCallback(async () => {
    try {
      const res = await sprintsApi.getAll(selectedCourse ? { course: selectedCourse } : {});
      setSprints(res.data || []);
    } catch (err) {
      console.error('Failed to load sprints:', err);
    }
  }, [selectedCourse]);

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
    fetchCourses();
  }, [fetchCourses]);

  useEffect(() => {
    fetchSprints();
    fetchIterations();
  }, [fetchSprints, fetchIterations]);

  const handleCreateNew = (defaultSprint = '') => {
    setEditingIteration(defaultSprint ? { sprint_name: defaultSprint } : null);
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

  const handleCreateSprintSubmit = async (e) => {
    e.preventDefault();
    if (!sprintFormData.name.trim()) return;
    setSprintActionLoading(true);
    try {
      await sprintsApi.create({
        name: sprintFormData.name.trim(),
        description: sprintFormData.description.trim(),
        course: selectedCourse || 'All Courses',
      });
      setToast({ type: 'success', message: `Sprint '${sprintFormData.name}' created successfully.` });
      setIsCreateSprintOpen(false);
      setSprintFormData({ name: '', description: '' });
      fetchSprints();
      fetchIterations();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to create sprint.' });
    } finally {
      setSprintActionLoading(false);
    }
  };

  const handleDeleteSprintConfirm = async () => {
    if (!sprintToDelete) return;
    setSprintActionLoading(true);
    try {
      if (sprintToDelete.id) {
        await sprintsApi.delete(sprintToDelete.id);
      }
      setToast({ type: 'success', message: `Sprint '${sprintToDelete.name}' deleted successfully.` });
      setSprintToDelete(null);
      fetchSprints();
      fetchIterations();
    } catch (err) {
      setToast({ type: 'error', message: err.response?.data?.message || err.message || 'Failed to delete sprint.' });
    } finally {
      setSprintActionLoading(false);
    }
  };

  // Filtered iterations list
  const filteredIterations = useMemo(() => {
    const now = new Date();
    return iterations.filter((item) => {
      // Course filter
      if (selectedCourse && item.course !== selectedCourse && item.course !== 'All Courses') {
        return false;
      }

      // Status filter
      const dl = new Date(item.deadline);
      const isCompleted = dl < now;
      if (statusFilter === 'active' && isCompleted) return false;
      if (statusFilter === 'completed' && !isCompleted) return false;

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
  }, [iterations, selectedCourse, statusFilter, searchQuery]);

  // Group milestones into Sprint containers (merging explicit Sprints + any sprint_names on iterations)
  const sprintContainers = useMemo(() => {
    const sprintMap = {};

    // 1. Pre-fill with Sprints from database
    sprints.forEach((s) => {
      sprintMap[s.name] = {
        id: s.id || s._id,
        name: s.name,
        description: s.description || '',
        course: s.course || 'All Courses',
        milestones: [],
      };
    });

    // 2. Put filtered iterations into their matching sprint container
    filteredIterations.forEach((item) => {
      const sName = item.sprint_name || 'Sprint 1';
      if (!sprintMap[sName]) {
        sprintMap[sName] = {
          id: null,
          name: sName,
          description: item.sprint_description || '',
          course: item.course || 'All Courses',
          milestones: [],
        };
      }
      sprintMap[sName].milestones.push(item);
    });

    // Sort milestones in each sprint by milestone_order
    Object.keys(sprintMap).forEach((key) => {
      sprintMap[key].milestones.sort(
        (a, b) => (Number(a.milestone_order) || 1) - (Number(b.milestone_order) || 1)
      );
    });

    return Object.values(sprintMap);
  }, [sprints, filteredIterations]);

  // Status counts for tabs
  const statusCounts = useMemo(() => {
    const now = new Date();
    let active = 0;
    let completed = 0;
    iterations.forEach((item) => {
      if (new Date(item.deadline) >= now) active += 1;
      else completed += 1;
    });
    return { all: iterations.length, active, completed };
  }, [iterations]);

  return (
    <div className="page-frame-container">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Sprints & Project Milestones"
        subtitle="Configure structured sprints, submission deliverables, deadlines, and evaluation rubrics."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Sprints & Milestones' },
        ]}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Button 1: Create Sprint (Distinct Indigo Color Scheme) */}
          <button
            type="button"
            onClick={() => {
              setSprintFormData({ name: '', description: '' });
              setIsCreateSprintOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#4f46e5',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#4338ca')}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#4f46e5')}
          >
            <Layers size={15} />
            <span>Create Sprint</span>
          </button>

          {/* Button 2: Add Iteration (Primary University Blue) */}
          <button
            type="button"
            onClick={() => handleCreateNew()}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
          >
            <Plus size={15} />
            <span>Add Iteration</span>
          </button>
        </div>
      </PageHeader>

      {/* Top Sub-Navigation Bar (Restructured: Sprints, Rubrics, Submissions) */}
      <IterationsTabBar />

      {/* Main Filter & Action Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          marginBottom: '20px',
        }}
      >
        {/* Left Side: Search & Course Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              width: '260px',
            }}
          >
            <Search
              size={16}
              style={{
                position: 'absolute',
                left: '12px',
                color: '#94a3b8',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search milestones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            />
          </div>

          {/* Course Selector Filter */}
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: '7px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              backgroundColor: '#ffffff',
              color: '#1e293b',
              cursor: 'pointer',
              outline: 'none',
              minWidth: '200px',
            }}
          >
            <option value="">All Courses</option>
            {courses.map((c) => (
              <option key={c._id || c.name} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Right Side: Status Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              backgroundColor: '#f1f5f9',
              padding: '3px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            {[
              { key: 'all', label: `All (${statusCounts.all})` },
              { key: 'active', label: `Active (${statusCounts.active})` },
              { key: 'completed', label: `Completed (${statusCounts.completed})` },
            ].map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
                  style={{
                    border: 'none',
                    backgroundColor: active ? '#ffffff' : 'transparent',
                    color: active ? '#0f172a' : '#64748b',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    fontWeight: active ? 600 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Sprints & Milestones View */}
      {loading ? (
        <ContentLoader label="Loading sprints & milestones..." />
      ) : sprintContainers.length === 0 ? (
        <EmptyState
          title="No Sprints or Milestones Found"
          description={
            searchQuery || selectedCourse || statusFilter !== 'all'
              ? 'No milestones match the selected filters.'
              : 'No sprints or iteration milestones have been created yet.'
          }
          actionLabel="Create Sprint"
          onAction={() => setIsCreateSprintOpen(true)}
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {sprintContainers.map((sprint) => {
            const sprintItems = sprint.milestones;
            return (
              <div
                key={sprint.name}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                  overflow: 'hidden',
                }}
              >
                {/* Sprint Header */}
                <div
                  style={{
                    padding: '14px 20px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={18} color="#4f46e5" />
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>
                        {sprint.name}
                      </span>
                    </div>

                    <span
                      style={{
                        fontSize: '11.5px',
                        fontWeight: 600,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        backgroundColor: '#e0e7ff',
                        color: '#4338ca',
                        border: '1px solid #c7d2fe',
                      }}
                    >
                      {sprintItems.length} Milestone{sprintItems.length === 1 ? '' : 's'}
                    </span>

                    {sprint.description && (
                      <span style={{ fontSize: '12.5px', color: '#64748b' }}>
                        • {sprint.description}
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Add Milestone to Sprint button */}
                    <button
                      type="button"
                      onClick={() => handleCreateNew(sprint.name)}
                      className="btn btn-ghost btn-sm"
                      style={{ fontSize: '12px', fontWeight: 600, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={14} /> Add Milestone
                    </button>

                    {/* Delete Sprint button */}
                    <button
                      type="button"
                      onClick={() => setSprintToDelete(sprint)}
                      className="btn btn-danger-outline btn-sm"
                      style={{ fontSize: '11.5px', padding: '4px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Delete this sprint container"
                    >
                      <Trash2 size={13} />
                      <span>Delete Sprint</span>
                    </button>
                  </div>
                </div>

                {/* Milestones Content */}
                {sprintItems.length === 0 ? (
                  <div style={{ padding: '28px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <FileText size={28} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#64748b' }}>
                      No milestones attached to {sprint.name} yet.
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateNew(sprint.name)}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Plus size={13} /> Add First Milestone
                    </button>
                  </div>
                ) : (
                  <div className="table-responsive-container table-wide">
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                          <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '240px' }}>
                            Milestone & Deliverable
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '160px' }}>
                            Status & Schedule
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '160px' }}>
                            Deliverable Progress
                          </th>
                          <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', minWidth: '100px', textAlign: 'right' }}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sprintItems.map((item, idx) => {
                          const dl = new Date(item.deadline);
                          const isCompleted = dl < new Date();
                          const stats = item.submission_stats || {};
                          const totalGroups = stats.total_groups || 0;
                          const submitted = stats.submitted_count || 0;
                          const pct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
                          const rubricCount = item.rubrics?.length || 0;
                          const isGroupFormation = Boolean(item.is_group_formation || item.milestone_type === 'group_formation');

                          return (
                            <tr
                              key={item._id}
                              style={{
                                borderBottom: idx === sprintItems.length - 1 ? 'none' : '1px solid #f1f5f9',
                                transition: 'background-color 0.15s ease',
                              }}
                            >
                              {/* 1. Milestone & Deliverable */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                                  <div
                                    style={{
                                      width: '36px',
                                      height: '36px',
                                      borderRadius: '8px',
                                      backgroundColor: isCompleted ? '#f1f5f9' : 'var(--primary-light)',
                                      border: `1px solid ${isCompleted ? '#e2e8f0' : '#bfdbfe'}`,
                                      color: isCompleted ? '#64748b' : 'var(--primary)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      fontWeight: 700,
                                      fontSize: '13px',
                                      flexShrink: 0,
                                    }}
                                  >
                                    M{item.milestone_order || idx + 1}
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>
                                        {item.title}
                                      </span>

                                      {isGroupFormation && (
                                        <span
                                          style={{
                                            fontSize: '11px',
                                            fontWeight: 600,
                                            padding: '2px 7px',
                                            borderRadius: '4px',
                                            backgroundColor: '#fef3c7',
                                            color: '#92400e',
                                            border: '1px solid #fde68a',
                                          }}
                                        >
                                          Group Formation Cutoff
                                        </span>
                                      )}
                                    </div>

                                    {item.details && (
                                      <span
                                        style={{
                                          fontSize: '12.5px',
                                          color: '#64748b',
                                          lineHeight: '1.4',
                                          maxWidth: '420px',
                                        }}
                                      >
                                        {item.details}
                                      </span>
                                    )}

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '11.5px', color: '#0073aa', fontWeight: 600 }}>
                                        🎓 {item.course}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Status & Schedule */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                  <div>
                                    <span
                                      style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '5px',
                                        padding: '3px 9px',
                                        borderRadius: '6px',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        backgroundColor: isCompleted ? '#f1f5f9' : '#ecfdf5',
                                        color: isCompleted ? '#475569' : '#059669',
                                        border: `1px solid ${isCompleted ? '#e2e8f0' : '#a7f3d0'}`,
                                      }}
                                    >
                                      {isCompleted ? (
                                        <span>Completed</span>
                                      ) : (
                                        <>
                                          <CheckCircle2 size={12} />
                                          <span>Active</span>
                                        </>
                                      )}
                                    </span>
                                  </div>

                                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#475569' }}>
                                    <Calendar size={13} style={{ color: '#94a3b8' }} />
                                    <span>{formatHumanDate(item.deadline)}</span>
                                    <span style={{ color: '#94a3b8' }}>•</span>
                                    <span style={{ color: '#64748b' }}>{formatHumanTime(item.deadline)}</span>
                                  </div>
                                </div>
                              </td>

                              {/* 3. Deliverable Progress & Rubrics */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                                    <span>Submissions</span>
                                    <span style={{ fontWeight: 600, color: '#0f172a' }}>
                                      {submitted} / {totalGroups} ({pct}%)
                                    </span>
                                  </div>

                                  <div
                                    style={{
                                      width: '100%',
                                      height: '6px',
                                      backgroundColor: '#e2e8f0',
                                      borderRadius: '3px',
                                      overflow: 'hidden',
                                    }}
                                  >
                                    <div
                                      style={{
                                        width: `${pct}%`,
                                        height: '100%',
                                        backgroundColor: pct === 100 ? '#10b981' : 'var(--primary)',
                                        borderRadius: '3px',
                                        transition: 'width 0.3s ease',
                                      }}
                                    />
                                  </div>

                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => handleOpenRubrics(item)}
                                      style={{
                                        border: 'none',
                                        background: 'none',
                                        padding: 0,
                                        cursor: 'pointer',
                                        fontSize: '11.5px',
                                        fontWeight: 600,
                                        color: rubricCount > 0 ? '#4f46e5' : '#64748b',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      <Sliders size={12} />
                                      <span>
                                        {rubricCount > 0 ? `${rubricCount} Rubric Criteria Linked` : '+ Attach Rubric Criteria'}
                                      </span>
                                    </button>
                                  </div>
                                </div>
                              </td>

                              {/* 4. Actions */}
                              <td style={{ padding: '16px 18px', verticalAlign: 'top', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  {/* Submissions Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/manager/iterations/${item._id}/submissions`)}
                                    title="View Group Submissions & Defaulters"
                                    className="btn btn-ghost btn-sm"
                                  >
                                    <Eye size={17} />
                                  </button>

                                  {/* Rubrics Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleOpenRubrics(item)}
                                    title={rubricCount > 0 ? `Configure Rubrics (${rubricCount} criteria)` : 'Configure Rubrics'}
                                    className="btn btn-ghost btn-sm"
                                    style={{ color: rubricCount > 0 ? 'var(--primary)' : undefined }}
                                  >
                                    <Sliders size={17} />
                                  </button>

                                  {/* Edit Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => handleEdit(item)}
                                    title="Edit Milestone"
                                    className="btn btn-ghost btn-sm"
                                  >
                                    <Edit2 size={16} />
                                  </button>

                                  {/* Delete Icon Button */}
                                  <button
                                    type="button"
                                    onClick={() => setIterationToDelete(item)}
                                    title="Delete Milestone"
                                    className="btn btn-danger-outline btn-sm"
                                  >
                                    <Trash2 size={16} />
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
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Create Sprint (Name + Description only) */}
      <Modal
        isOpen={isCreateSprintOpen}
        onClose={() => setIsCreateSprintOpen(false)}
        title="Create New Sprint Container"
        maxWidth="500px"
      >
        <form onSubmit={handleCreateSprintSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Sprint Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              placeholder="e.g. Sprint 1 — Requirement Engineering & Planning"
              value={sprintFormData.name}
              onChange={(e) => setSprintFormData({ ...sprintFormData, name: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Sprint Description (Optional)
            </label>
            <textarea
              rows={3}
              placeholder="Summary of goals, deliverables, and student expectations for this sprint..."
              value={sprintFormData.description}
              onChange={(e) => setSprintFormData({ ...sprintFormData, description: e.target.value })}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '13.5px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => setIsCreateSprintOpen(false)}
              disabled={sprintActionLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={sprintActionLoading}
              style={{
                backgroundColor: '#4f46e5',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {sprintActionLoading ? 'Creating...' : 'Create Sprint'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Sprint Confirmation */}
      <Modal
        isOpen={!!sprintToDelete}
        onClose={() => setSprintToDelete(null)}
        title="Delete Sprint Container"
        maxWidth="440px"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, margin: '0 0 16px' }}>
            Are you sure you want to delete sprint container <strong>"{sprintToDelete?.name}"</strong>?
            {sprintToDelete?.milestones?.length > 0 && (
              <span style={{ display: 'block', color: '#b91c1c', fontWeight: 500, marginTop: '8px' }}>
                ⚠️ Notice: This sprint has {sprintToDelete.milestones.length} attached milestone(s).
              </span>
            )}
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setSprintToDelete(null)}
              disabled={sprintActionLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteSprintConfirm}
              disabled={sprintActionLoading}
              className="btn btn-danger"
            >
              {sprintActionLoading ? 'Deleting...' : 'Delete Sprint'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Form Modal (Create / Edit Iteration) */}
      <IterationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingIteration}
        courses={courses}
        onSave={() => {
          setToast({
            type: 'success',
            message: editingIteration ? 'Iteration updated successfully.' : 'Iteration created successfully.',
          });
          fetchIterations();
          fetchSprints();
        }}
      />

      {/* Rubric Builder Modal */}
      <RubricBuilderModal
        isOpen={isRubricOpen}
        onClose={() => setIsRubricOpen(false)}
        iteration={rubricIteration}
        courses={courses}
        onSave={() => {
          setToast({ type: 'success', message: 'Evaluation rubrics updated successfully.' });
          fetchIterations();
        }}
        onSuccess={() => {
          setToast({ type: 'success', message: 'Evaluation rubrics updated successfully.' });
          fetchIterations();
        }}
      />

      {/* Delete Milestone Confirmation Modal */}
      <Modal
        isOpen={!!iterationToDelete}
        onClose={() => setIterationToDelete(null)}
        title="Confirm Deletion"
        maxWidth="440px"
      >
        <div style={{ padding: '8px 0' }}>
          <p style={{ fontSize: '14px', color: '#334155', lineHeight: 1.5, margin: '0 0 18px' }}>
            Are you sure you want to delete <strong>"{iterationToDelete?.title}"</strong>? This will permanently delete the milestone.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setIterationToDelete(null)}
              disabled={deleteLoading}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              className="btn btn-danger"
            >
              {deleteLoading ? 'Deleting...' : 'Delete Milestone'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
