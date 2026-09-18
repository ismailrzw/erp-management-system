import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  BookOpen,
  Calendar,
} from 'lucide-react';
import { coursesApi } from '../../../api/coursesApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { formatDate } from '../../../utils/dateUtils';

export const CourseListPage = () => {
  const [courses, setCourses] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    dept: '',
    min_group: 1,
    max_group: 4,
    group_formation_deadline: '',
  });
  const [courseToDelete, setCourseToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const fetchCourses = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = { deleted: false, limit: 100 };
        if (search.trim()) params.search = search.trim();
        if (selectedDept) params.dept = selectedDept;

        const res = await coursesApi.list(params);
        if (res.success && res.data) {
          setCourses(res.data.items || res.data || []);
        }
      } catch (err) {
        setToast({
          message: err.response?.data?.message || 'Failed to fetch courses',
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, selectedDept]
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [cRes, dRes] = await Promise.all([
          coursesApi.list({ deleted: false, limit: 100 }),
          departmentsApi.list({ deleted: false, limit: 100 }),
        ]);

        if (isMounted) {
          if (cRes.success && cRes.data) setCourses(cRes.data.items || cRes.data || []);
          if (dRes.success && dRes.data) setDepartments(dRes.data.items || dRes.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to load courses',
            type: 'error',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchCourses(true);
  };

  const handleOpenEdit = (course) => {
    const rawDeadline = course.group_formation_deadline || course.deadline;
    setEditFormData({
      id: course.id || course._id,
      name: course.name,
      dept: course.dept,
      min_group: course.min_group || 1,
      max_group: course.max_group || 4,
      group_formation_deadline: rawDeadline ? rawDeadline.split('T')[0] : '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await coursesApi.update(editFormData.id, {
        name: editFormData.name.trim(),
        dept: editFormData.dept,
        min_group: parseInt(editFormData.min_group, 10),
        max_group: parseInt(editFormData.max_group, 10),
        group_formation_deadline: editFormData.group_formation_deadline || undefined,
      });
      setToast({ message: 'Course updated successfully', type: 'success' });
      setIsEditModalOpen(false);
      fetchCourses(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to update course',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!courseToDelete) return;
    try {
      setActionLoading(true);
      await coursesApi.delete(courseToDelete.id || courseToDelete._id);
      setToast({ message: 'Course moved to Recycle Bin', type: 'success' });
      setCourseToDelete(null);
      fetchCourses(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to delete course',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing && courses.length === 0) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Courses Management"
          subtitle="Manage course offerings, credit hours, and department affiliations."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Courses', to: '/manager/courses' },
            { label: 'View All Courses' },
          ]}
        />
        <ContentLoader label="Loading courses..." />
      </div>
    );
  }

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Unified Page Header */}
      <PageHeader
        title="Courses Management"
        subtitle="Manage course offerings, credit hours, and department affiliations."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Courses', to: '/manager/courses' },
          { label: 'View All Courses' },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/manager/courses/add')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              padding: '8px 14px',
              backgroundColor: '#0073aa',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#006291')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#0073aa')}
          >
            <Plus size={15} />
            <span>Add New Course</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/manager/courses/trash')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#64748b',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <Trash2 size={15} />
            <span>Recycle Bin</span>
          </button>
          <button
            type="button"
            onClick={() => fetchCourses(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </PageHeader>

      {/* Filter / Search Bar */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Course Name..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
          </div>

          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 32px 8px 11px',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d.id || d._id || d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            style={{
              padding: '8px 16px',
              backgroundColor: '#0073aa',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Search
          </button>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedDept('');
              fetchCourses(true);
            }}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 12px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#475569',
              borderRadius: '4px',
              fontSize: '13px',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Reset</span>
          </button>
        </form>
      </div>

      {/* Courses Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive-container table-wide" style={{ borderRadius: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '160px' }}>Course Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '70px' }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '110px' }}>Group Limits</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '180px' }}>Group Formation Deadline</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right', minWidth: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <BookOpen size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>No courses found</div>
                  </td>
                </tr>
              ) : (
                courses.map((c) => (
                  <tr
                    key={c.id || c._id}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{c.name}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: '#eef6fb',
                          color: '#0073aa',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                      >
                        {c.dept}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>
                      {c.min_group || 1} – {c.max_group || 4} members
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Calendar size={13} />
                        <span>{formatDate(c.group_formation_deadline || c.deadline) || 'No deadline'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(c)}
                          style={{
                            border: '1px solid #cbd5e1',
                            backgroundColor: '#ffffff',
                            color: '#334155',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCourseToDelete(c)}
                          style={{
                            border: 'none',
                            backgroundColor: '#fdecea',
                            color: '#dc2626',
                            padding: '5px 8px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                          }}
                        >
                          <Trash2 size={13} />
                          <span>Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Course */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Course">
        <form onSubmit={handleSaveEdit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
              Course Name *
            </label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Department *
            </label>
            <select
              value={editFormData.dept}
              onChange={(e) => setEditFormData({ ...editFormData, dept: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 34px 8px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
            >
              {departments.map((d) => (
                <option key={d.id || d._id || d.code} value={d.code}>
                  {d.code} - {d.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                Min Group Size *
              </label>
              <input
                type="number"
                min={1}
                value={editFormData.min_group}
                onChange={(e) => setEditFormData({ ...editFormData, min_group: e.target.value })}
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                Max Group Size *
              </label>
              <input
                type="number"
                min={1}
                value={editFormData.max_group}
                onChange={(e) => setEditFormData({ ...editFormData, max_group: e.target.value })}
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Group Formation Deadline (YYYY-MM-DD)
            </label>
            <input
              type="date"
              value={editFormData.group_formation_deadline}
              onChange={(e) => setEditFormData({ ...editFormData, group_formation_deadline: e.target.value })}
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 500, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '4px', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none', backgroundColor: '#0073aa', color: '#ffffff', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal isOpen={!!courseToDelete} onClose={() => setCourseToDelete(null)} title="Move to Recycle Bin" maxWidth="420px">
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to delete course <strong>{courseToDelete?.name}</strong>?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setCourseToDelete(null)}
            style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 500, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={actionLoading}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none', backgroundColor: '#dc2626', color: '#ffffff', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
          >
            {actionLoading ? 'Deleting...' : 'Move to Trash'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
