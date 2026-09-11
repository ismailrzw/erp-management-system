import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { iterationsApi } from '../../../api/iterationsApi';
import { coursesApi } from '../../../api/coursesApi';
import { IterationFormModal } from './IterationFormModal';
import { RubricBuilderModal } from './RubricBuilderModal';
import { Plus, Edit2, Sliders, Trash2, Calendar, FileText, Eye } from 'lucide-react';

export const IterationsManagePage = () => {
  const navigate = useNavigate();
  const [iterations, setIterations] = useState([]);
  const [courses, setCourses] = useState([]);
  const [selectedCourse, setSelectedCourse] = useState('');
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
      if (courseList.length > 0 && !selectedCourse) {
        setSelectedCourse(courseList[0].name);
      }
    } catch (err) {
      console.error('Failed to load courses:', err);
    }
  }, [selectedCourse]);

  const fetchIterations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await iterationsApi.getAll({ course: selectedCourse });
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
          gap: '12px',
          backgroundColor: '#ffffff',
          padding: '14px 18px',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        }}
      >
        <span style={{ fontSize: '13px', fontWeight: 600, color: '#475569' }}>Course Filter:</span>
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

      {/* Iterations Table or State */}
      {loading ? (
        <Preloader label="Loading iterations..." />
      ) : iterations.length === 0 ? (
        <EmptyState
          title="No Iterations Found"
          description={selectedCourse ? `No iterations configured for "${selectedCourse}".` : 'No iterations configured yet.'}
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
                <th style={{ padding: '12px 16px', fontSize: '12.5px', fontWeight: 600, color: '#475569', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {iterations.map((item) => {
                const rubricCount = item.rubrics?.length || 0;
                return (
                  <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '14px', color: '#0f172a' }}>{item.title}</div>
                      {item.details && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>{item.details}</div>}
                    </td>

                    <td style={{ padding: '14px 16px', fontSize: '13px', color: '#334155' }}>{item.course}</td>

                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#0f172a', fontWeight: 500 }}>
                        <Calendar size={14} style={{ color: '#64748b' }} />
                        <span>{item.deadline}</span>
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
