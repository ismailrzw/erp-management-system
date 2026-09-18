import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { Modal } from '../../../components/ui/Modal';
import { iterationsApi } from '../../../api/iterationsApi';
import { coursesApi } from '../../../api/coursesApi';
import { IterationFormModal } from './IterationFormModal';
import { RubricBuilderModal } from './RubricBuilderModal';
import {
  Plus,
  Edit2,
  Sliders,
  Trash2,
  Calendar,
  Eye,
  Search,
  CheckCircle2,
  Table as TableIcon,
  Flag,
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
  const [isMatrixModalOpen, setIsMatrixModalOpen] = useState(false);

  // Delete Confirmation Modal
  const [iterationToDelete, setIterationToDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await coursesApi.list();
      const courseList = res.data?.items || res.data || [];
      setCourses(courseList);
    } catch (err) {
      console.error('Failed to load courses:', err);
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
    fetchCourses();
  }, [fetchCourses]);

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

  // Aggregate Cross-Course Matrix
  const courseMatrix = useMemo(() => {
    const map = {};
    iterations.forEach((item) => {
      const stats = item.submission_stats || {};
      (stats.by_course || []).forEach((bc) => {
        const key = `${bc.course}__${bc.dept}`;
        if (!map[key]) {
          map[key] = {
            course: bc.course,
            dept: bc.dept,
            total_groups: bc.total_groups || 0,
            submitted_count: 0,
            late_count: 0,
            on_time_count: 0,
          };
        }
        map[key].submitted_count += bc.submitted_count || 0;
        map[key].late_count += bc.late_count || 0;
        map[key].on_time_count += bc.on_time_count || 0;
      });
    });
    return Object.values(map);
  }, [iterations]);

  return (
    <div style={{ padding: '24px 32px', maxWidth: '1240px', margin: '0 auto', fontFamily: 'inherit' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Top Sub-Navigation Bar (Stitch Design) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #e2e8f0',
          paddingBottom: '12px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '28px' }}>
          {/* 1. Milestones (active) */}
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13.5px',
              fontWeight: 600,
              color: '#2563eb',
              position: 'relative',
              paddingBottom: '8px',
              cursor: 'pointer',
            }}
          >
            <Flag size={16} />
            <span>Milestones</span>
            <span
              style={{
                position: 'absolute',
                bottom: '-13px',
                left: 0,
                right: 0,
                height: '2px',
                backgroundColor: '#2563eb',
                borderRadius: '2px',
              }}
            />
          </div>

          {/* 2. Submissions */}
          <button
            type="button"
            onClick={() => navigate('/manager/iterations/submissions')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13.5px',
              fontWeight: 500,
              color: '#64748b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 8px 0',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1e293b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <Eye size={15} />
            <span>Submissions</span>
          </button>

          {/* 3. Rubrics */}
          <button
            type="button"
            onClick={() => navigate('/manager/rubric-templates')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13.5px',
              fontWeight: 500,
              color: '#64748b',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '0 0 8px 0',
              transition: 'color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#1e293b')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#64748b')}
          >
            <Sliders size={15} />
            <span>Rubrics</span>
          </button>
        </div>

        {/* Term / Cycle Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b' }}>
          <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981' }} />
          <span>Active Academic Semester</span>
        </div>
      </div>

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
        {/* Left Side: Search & Course Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: '1 1 auto' }}>
          {/* Search Input */}
          <div style={{ position: 'relative', minWidth: '220px', maxWidth: '300px', flex: '1 1 220px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
            <input
              type="text"
              placeholder="Filter milestones..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px 8px 34px',
                borderRadius: '7px',
                border: '1px solid #cbd5e1',
                fontSize: '13px',
                backgroundColor: '#ffffff',
                color: '#1e293b',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Course Selector Dropdown */}
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

        {/* Right Side: Status Tabs + "+ Add Iteration" Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          {/* Status Tabs (All, Active, Completed) */}
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

          {/* Primary CTA Button */}
          <button
            type="button"
            onClick={handleCreateNew}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              borderRadius: '7px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(37,99,235,0.2)',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#1d4ed8')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          >
            <Plus size={16} />
            <span>Add Iteration</span>
          </button>
        </div>
      </div>

      {/* Main Milestones Table */}
      {loading ? (
        <Preloader label="Loading milestones..." />
      ) : filteredIterations.length === 0 ? (
        <EmptyState
          title="No Milestones Found"
          description={
            searchQuery || selectedCourse || statusFilter !== 'all'
              ? 'No milestones match the selected filters.'
              : 'No iteration milestones have been created yet.'
          }
          actionLabel="Create First Milestone"
          onAction={handleCreateNew}
        />
      ) : (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
            marginBottom: '24px',
          }}
        >
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', width: '40%' }}>
                  Milestone & Deliverable
                </th>
                <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', width: '25%' }}>
                  Status & Schedule
                </th>
                <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', width: '20%' }}>
                  Deliverable Progress
                </th>
                <th style={{ padding: '12px 18px', fontSize: '11.5px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.04em', width: '15%', textAlign: 'right' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredIterations.map((item, idx) => {
                const dl = new Date(item.deadline);
                const isCompleted = dl < new Date();
                const stats = item.submission_stats || {};
                const totalGroups = stats.total_groups || 0;
                const submitted = stats.submitted_count || 0;
                const pct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
                const rubricCount = item.rubrics?.length || 0;

                return (
                  <tr
                    key={item._id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background-color 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                  >
                    {/* 1. Milestone & Deliverable */}
                    <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        {/* Milestone Badge (e.g. M1, M2) */}
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '8px',
                            backgroundColor: isCompleted ? '#f1f5f9' : '#eff6ff',
                            border: `1px solid ${isCompleted ? '#e2e8f0' : '#bfdbfe'}`,
                            color: isCompleted ? '#64748b' : '#2563eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '13px',
                            fontWeight: 700,
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          M{idx + 1}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '14.5px', fontWeight: 600, color: '#0f172a' }}>
                              {item.title}
                            </span>
                            {item.course && (
                              <span
                                style={{
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '1px 7px',
                                  borderRadius: '10px',
                                  backgroundColor: item.course === 'All Courses' ? '#f3e8ff' : '#f1f5f9',
                                  color: item.course === 'All Courses' ? '#7c3aed' : '#475569',
                                  border: `1px solid ${item.course === 'All Courses' ? '#ddd6fe' : '#e2e8f0'}`,
                                }}
                              >
                                {item.course}
                              </span>
                            )}
                          </div>
                          {item.details && (
                            <p
                              style={{
                                margin: '4px 0 0',
                                fontSize: '12.5px',
                                color: '#64748b',
                                lineHeight: 1.4,
                                maxWidth: '420px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {item.details}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 2. Status & Schedule (ONLY status active/completed + due date) */}
                    <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <div>
                          {isCompleted ? (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                backgroundColor: '#f1f5f9',
                                color: '#475569',
                                border: '1px solid #cbd5e1',
                              }}
                            >
                              <CheckCircle2 size={12} /> Completed
                            </span>
                          ) : (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11.5px',
                                fontWeight: 600,
                                backgroundColor: '#ecfdf5',
                                color: '#059669',
                                border: '1px solid #a7f3d0',
                              }}
                            >
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                              Active
                            </span>
                          )}
                        </div>

                        <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={13} style={{ color: '#94a3b8' }} />
                          <span>Due: {formatHumanDate(item.deadline)}</span>
                          {formatHumanTime(item.deadline) && (
                            <span style={{ color: '#94a3b8' }}>• {formatHumanTime(item.deadline)}</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* 3. Deliverable Progress */}
                    <td style={{ padding: '16px 18px', verticalAlign: 'top' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                          <span style={{ fontWeight: 600, color: '#334155' }}>
                            {submitted} / {totalGroups} Groups
                          </span>
                          <span style={{ fontWeight: 600, color: pct > 0 ? '#10b981' : '#94a3b8' }}>
                            {pct}%
                          </span>
                        </div>

                        {/* Clean Progress Bar */}
                        <div
                          style={{
                            width: '100%',
                            height: '6px',
                            borderRadius: '3px',
                            backgroundColor: '#f1f5f9',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${pct}%`,
                              height: '100%',
                              backgroundColor: pct === 100 ? '#10b981' : '#2563eb',
                              borderRadius: '3px',
                              transition: 'width 0.3s ease',
                            }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* 4. Actions */}
                    <td style={{ padding: '16px 18px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        {/* Submissions Icon Button */}
                        <button
                          type="button"
                          onClick={() => navigate(`/manager/iterations/${item._id}/submissions`)}
                          title="View Group Submissions"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.color = '#2563eb';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                          }}
                        >
                          <Eye size={17} />
                        </button>

                        {/* Rubrics Icon Button */}
                        <button
                          type="button"
                          onClick={() => handleOpenRubrics(item)}
                          title={rubricCount > 0 ? `Configure Rubrics (${rubricCount} criteria)` : 'Configure Rubrics'}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: rubricCount > 0 ? '#2563eb' : '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#eff6ff';
                            e.currentTarget.style.color = '#1d4ed8';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = rubricCount > 0 ? '#2563eb' : '#64748b';
                          }}
                        >
                          <Sliders size={17} />
                        </button>

                        {/* Edit Icon Button */}
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          title="Edit Milestone"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#64748b',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#f1f5f9';
                            e.currentTarget.style.color = '#0f172a';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#64748b';
                          }}
                        >
                          <Edit2 size={16} />
                        </button>

                        {/* Delete Icon Button */}
                        <button
                          type="button"
                          onClick={() => setIterationToDelete(item)}
                          title="Delete Milestone"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor = '#fef2f2';
                            e.currentTarget.style.color = '#dc2626';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                            e.currentTarget.style.color = '#94a3b8';
                          }}
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



      {/* Form Modal (Create / Edit) */}
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

      {/* Delete Confirmation Modal */}
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
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirmDelete}
              disabled={deleteLoading}
              style={{
                padding: '7px 14px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#dc2626',
                color: '#ffffff',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Milestone'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
