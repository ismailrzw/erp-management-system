import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { DeadlineCountdown } from '../../../components/ui/DeadlineCountdown';
import { iterationsApi } from '../../../api/iterationsApi';
import { coursesApi } from '../../../api/coursesApi';
import { IterationFormModal } from './IterationFormModal';
import { RubricBuilderModal } from './RubricBuilderModal';
import { Plus, Edit2, Sliders, Trash2, Calendar, FileText, Eye, Filter, Users } from 'lucide-react';

const statusFilterOptions = [
  { key: 'all', label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'overdue', label: 'Overdue' },
];

const pillStyle = (active) => ({
  padding: '5px 14px',
  borderRadius: '20px',
  fontSize: '12.5px',
  fontWeight: 600,
  cursor: 'pointer',
  border: active ? '1px solid #2563eb' : '1px solid #e2e8f0',
  backgroundColor: active ? '#eff6ff' : '#ffffff',
  color: active ? '#1d4ed8' : '#64748b',
  transition: 'all 0.15s ease',
});

export const IterationsManagePage = () => {
  const navigate = useNavigate();
  const [iterations, setIterations] = useState([]);
  const [courses, setCourses] = useState([]);
  // BUG FIX: Default to empty string = "All Courses" instead of auto-selecting first course
  const [selectedCourse, setSelectedCourse] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingIteration, setEditingIteration] = useState(null);
  const [isRubricOpen, setIsRubricOpen] = useState(false);
  const [rubricIteration, setRubricIteration] = useState(null);

  const fetchCourses = useCallback(async () => {
    try {
      const res = await coursesApi.list();
      const courseList = res.data?.items || res.data || [];
      setCourses(courseList);
      // BUG FIX: Do NOT auto-select the first course — leave as '' so "All Courses" is shown
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

  const handleDelete = async (item) => {
    if (!window.confirm(`Are you sure you want to delete "${item.title}"?`)) return;
    try {
      await iterationsApi.delete(item._id);
      setToast({ type: 'success', message: 'Iteration deleted successfully.' });
      fetchIterations();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to delete iteration.';
      setToast({ type: 'error', message: msg });
    }
  };

  // Apply status filter
  const now = new Date();
  const filteredIterations = iterations.filter((item) => {
    if (statusFilter === 'all') return true;
    const dl = new Date(item.deadline);
    if (statusFilter === 'upcoming') return dl >= now;
    if (statusFilter === 'overdue') return dl < now;
    return true;
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <PageHeader
        title="Iteration Milestones"
        subtitle="Configure FYP iteration deadlines and weighted evaluation rubrics."
      >
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
            fontSize: '13.5px',
            fontWeight: 600,
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Plus size={16} />
          Add Iteration
        </button>
      </PageHeader>

      {/* Filter Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={14} style={{ color: '#64748b' }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Course:</span>
          <select
            value={selectedCourse}
            onChange={(e) => setSelectedCourse(e.target.value)}
            style={{
              padding: '7px 12px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              fontSize: '13px',
              color: '#1e293b',
              minWidth: '220px',
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

        {/* Status filter pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginRight: '4px' }}>Status:</span>
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
        </div>
      </div>

      {/* Iterations Table or State */}
      {loading ? (
        <Preloader label="Loading iterations..." />
      ) : filteredIterations.length === 0 ? (
        <EmptyState
          title="No Iterations Found"
          description={
            statusFilter !== 'all'
              ? `No ${statusFilter} iterations found.`
              : selectedCourse
                ? `No iterations configured for "${selectedCourse}".`
                : 'No iterations configured yet.'
          }
          actionLabel="Create Iteration"
          onAction={handleCreateNew}
        />
      ) : (
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Iteration Title</th>
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Course</th>
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Deadline</th>
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Rubrics</th>
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569' }}>Submissions</th>
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredIterations.map((item) => {
                const rubricCount = item.rubrics?.length || 0;
                const stats = item.submission_stats || {};
                const totalGroups = stats.total_groups || 0;
                const submitted = stats.submitted_count || 0;
                const progressPct = totalGroups > 0 ? Math.round((submitted / totalGroups) * 100) : 0;
                const progressColor = progressPct === 100 ? '#16a34a' : progressPct > 0 ? '#d97706' : '#dc2626';

                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{item.title}</div>
                      {item.details && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.details}</div>}
                    </td>

                    <td style={{ padding: '14px 16px' }}>
                      <span
                        style={{
                          fontSize: '12.5px',
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

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>
                          <Calendar size={14} style={{ color: '#64748b' }} />
                          <span>{item.deadline}</span>
                        </div>
                        <DeadlineCountdown deadline={item.deadline} />
                      </div>
                    </td>

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

                    {/* NEW: Inline submission progress */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', minWidth: '120px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={13} style={{ color: '#64748b' }} />
                          <span style={{ fontSize: '13px', fontWeight: 600, color: progressColor }}>
                            {submitted}/{totalGroups}
                          </span>
                          <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>submitted</span>
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
                        {stats.late_count > 0 && (
                          <span style={{ fontSize: '11px', color: '#d97706', fontWeight: 500 }}>
                            {stats.late_count} late
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
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
                          <Eye size={14} />
                          Submissions
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
                          <Sliders size={14} />
                          Rubrics
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
                            color: '#475569',
                            cursor: 'pointer',
                          }}
                        >
                          <Edit2 size={14} />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          title="Delete Iteration"
                          style={{
                            padding: '6px',
                            borderRadius: '6px',
                            border: '1px solid #fecaca',
                            backgroundColor: '#fef2f2',
                            color: '#dc2626',
                            cursor: 'pointer',
                          }}
                        >
                          <Trash2 size={14} />
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

      {/* Form Modal */}
      <IterationFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        initialData={editingIteration}
        courses={courses}
        onSave={() => {
          setToast({ type: 'success', message: editingIteration ? 'Iteration updated.' : 'Iteration created.' });
          fetchIterations();
        }}
      />

      {/* Rubric Builder Modal */}
      <RubricBuilderModal
        isOpen={isRubricOpen}
        onClose={() => setIsRubricOpen(false)}
        iteration={rubricIteration}
        onSave={() => {
          setToast({ type: 'success', message: 'Rubrics updated successfully.' });
          fetchIterations();
        }}
      />
    </div>
  );
};
