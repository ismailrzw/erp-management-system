import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Upload,
  Trash2,
  Edit2,
  RefreshCw,
  Users,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
} from 'lucide-react';
import { studentsApi } from '../../../api/studentsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { coursesApi } from '../../../api/coursesApi';
import { teachersApi } from '../../../api/teachersApi';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';

export const StudentListPage = () => {
  const [students, setStudents] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Dropdown reference data
  const [departments, setDepartments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    section: '',
    course: '',
    teacher: '',
    recovery_email: '',
  });
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importReport, setImportReport] = useState(null);
  const [studentToDelete, setStudentToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const fetchStudents = useCallback(
    async (page = 1, isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = {
          page,
          limit: pagination.limit,
          deleted: false,
        };
        if (search.trim()) params.search = search.trim();
        if (selectedDept) params.dept = selectedDept;
        if (selectedSection) params.section = selectedSection;

        const res = await studentsApi.list(params);
        if (res.success && res.data) {
          const items = res.data.items || res.data || [];
          setStudents(items);
          setPagination({
            page: res.data.page || page,
            limit: res.data.limit || 10,
            total: res.data.total ?? items.length,
            pages: res.data.pages || Math.ceil((res.data.total || items.length) / (res.data.limit || 10)) || 1,
          });
        }
      } catch (err) {
        setToast({
          message: err.response?.data?.message || 'Failed to fetch students',
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pagination.limit, search, selectedDept, selectedSection]
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        const [dRes, cRes, tRes, sRes] = await Promise.all([
          departmentsApi.list({ limit: 100 }),
          coursesApi.list({ limit: 100 }),
          teachersApi.list({ limit: 100 }),
          studentsApi.list({ page: 1, limit: 10, deleted: false }),
        ]);

        if (isMounted) {
          if (dRes.success && dRes.data) setDepartments(dRes.data.items || dRes.data || []);
          if (cRes.success && cRes.data) setCourses(cRes.data.items || cRes.data || []);
          if (tRes.success && tRes.data) setTeachers(tRes.data.items || tRes.data || []);
          if (sRes.success && sRes.data) {
            const items = sRes.data.items || sRes.data || [];
            setStudents(items);
            setPagination({
              page: sRes.data.page || 1,
              limit: sRes.data.limit || 10,
              total: sRes.data.total ?? items.length,
              pages: sRes.data.pages || Math.ceil((sRes.data.total || items.length) / (sRes.data.limit || 10)) || 1,
            });
          }
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to load initial data',
            type: 'error',
          });
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStudents(1);
  };

  const handleOpenEdit = (student) => {
    setEditFormData({
      id: student.id || student._id,
      name: student.name || '',
      section: student.section || '',
      course: student.course || '',
      teacher: student.teacher || '',
      recovery_email: student.recovery_email || '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await studentsApi.update(editFormData.id, {
        name: editFormData.name.trim(),
        section: editFormData.section.trim(),
        course: editFormData.course.trim(),
        teacher: editFormData.teacher.trim(),
        recovery_email: editFormData.recovery_email.trim() || undefined,
      });
      setToast({ message: 'Student updated successfully', type: 'success' });
      setIsEditModalOpen(false);
      fetchStudents(pagination.page, true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to update student',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!studentToDelete) return;
    try {
      setActionLoading(true);
      await studentsApi.delete(studentToDelete.id || studentToDelete._id);
      setToast({ message: 'Student moved to Recycle Bin', type: 'success' });
      setStudentToDelete(null);
      fetchStudents(pagination.page, true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to delete student',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importFile) {
      setToast({ message: 'Please select a CSV or XLSX file', type: 'error' });
      return;
    }

    try {
      setImportLoading(true);
      const res = await studentsApi.bulkImport(importFile);
      if (res.success) {
        setImportReport(res.data);
        setToast({ message: res.message || 'Bulk import processed', type: 'success' });
        fetchStudents(1, true);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to import students file',
        type: 'error',
      });
    } finally {
      setImportLoading(false);
    }
  };

  if (loading) {
    return <Preloader />;
  }

  return (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Students Management
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            <span>Home</span> <span style={{ margin: '0 4px' }}>/</span>{' '}
            <span>Students</span> <span style={{ margin: '0 4px' }}>/</span>{' '}
            <span style={{ color: '#0073aa', fontWeight: 500 }}>View All Students</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => navigate('/manager/students/add')}
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
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Plus size={15} />
            <span>Add New Student</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setImportReport(null);
              setImportFile(null);
              setIsImportModalOpen(true);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Upload size={15} />
            <span>Bulk Import</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/manager/students/trash')}
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
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            <Trash2 size={15} />
            <span>Recycle Bin</span>
          </button>
        </div>
      </div>

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
        <form
          onSubmit={handleSearchSubmit}
          style={{
            display: 'flex',
            gap: '14px',
            alignItems: 'center',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name or Roll No..."
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
              style={{
                position: 'absolute',
                left: '11px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: '#94a3b8',
              }}
            />
          </div>

          <div style={{ flex: '0 1 160px' }}>
            <select
              value={selectedDept}
              onChange={(e) => setSelectedDept(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '13px',
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

          <div style={{ flex: '0 1 120px' }}>
            <select
              value={selectedSection}
              onChange={(e) => setSelectedSection(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 10px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '13px',
                color: '#334155',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            >
              <option value="">All Sections</option>
              <option value="A">Section A</option>
              <option value="B">Section B</option>
              <option value="C">Section C</option>
              <option value="D">Section D</option>
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
              setSelectedSection('');
              fetchStudents(1, true);
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

      {/* Students Data Table */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Roll No</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Sec</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Course</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Teacher</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Users size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>No students found</div>
                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                      Try adjusting filters or add a new student.
                    </div>
                  </td>
                </tr>
              ) : (
                students.map((stu) => (
                  <tr
                    key={stu.id || stu._id}
                    style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0073aa' }}>
                      {stu.roll}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>
                      {stu.name}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px' }}>
                      {stu.email}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>
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
                        {stu.dept}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155' }}>{stu.section}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{stu.course || '-'}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{stu.teacher || '-'}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(stu)}
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
                          title="Edit Student"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setStudentToDelete(stu)}
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
                          title="Delete Student"
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

        {/* Pagination Bar */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#64748b',
          }}
        >
          <div>
            Showing <strong>{students.length}</strong> of <strong>{pagination.total}</strong> students
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => fetchStudents(pagination.page - 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: pagination.page <= 1 ? '#cbd5e1' : '#334155',
                borderRadius: '4px',
                cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
            >
              <ChevronLeft size={14} />
              <span>Previous</span>
            </button>
            <span style={{ fontWeight: 500 }}>
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              type="button"
              disabled={pagination.page >= pagination.pages}
              onClick={() => fetchStudents(pagination.page + 1)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 10px',
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: pagination.page >= pagination.pages ? '#cbd5e1' : '#334155',
                borderRadius: '4px',
                cursor: pagination.page >= pagination.pages ? 'not-allowed' : 'pointer',
                fontSize: '12px',
              }}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Edit Student */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Student Profile">
        <form onSubmit={handleSaveEdit}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
              Full Name *
            </label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '14px' }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                Section *
              </label>
              <input
                type="text"
                value={editFormData.section}
                onChange={(e) => setEditFormData({ ...editFormData, section: e.target.value })}
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
              />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
                Course *
              </label>
              <select
                value={editFormData.course}
                onChange={(e) => setEditFormData({ ...editFormData, course: e.target.value })}
                required
                style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
              >
                <option value="">Select Course</option>
                {courses.map((c) => (
                  <option key={c.id || c._id || c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
              Assigned Teacher *
            </label>
            <select
              value={editFormData.teacher}
              onChange={(e) => setEditFormData({ ...editFormData, teacher: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
            >
              <option value="">Select Teacher</option>
              {teachers.map((t) => (
                <option key={t.id || t._id || t.email} value={t.name}>
                  {t.name} ({t.dept || 'Faculty'})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
              Recovery Email (Optional)
            </label>
            <input
              type="email"
              value={editFormData.recovery_email}
              onChange={(e) => setEditFormData({ ...editFormData, recovery_email: e.target.value })}
              placeholder="e.g. personal@gmail.com"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
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

      {/* Modal: Bulk Import */}
      <Modal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} title="Bulk Import Students">
        <form onSubmit={handleImportSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '1px dashed #cbd5e1',
                borderRadius: '6px',
                padding: '20px',
                textAlign: 'center',
              }}
            >
              <FileSpreadsheet size={32} color="#0073aa" style={{ margin: '0 auto 8px' }} />
              <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px' }}>
                Upload Excel or CSV File
              </div>
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px', marginBottom: '14px' }}>
                Supported formats: <code>.xlsx</code>, <code>.csv</code>
              </div>
              <input
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => setImportFile(e.target.files[0])}
                style={{ fontSize: '13px', color: '#475569' }}
              />
            </div>
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '6px' }}>
              Required columns in spreadsheet: <strong>Name, Roll, Dept, Section, Session, Course, Teacher</strong>
            </div>
          </div>

          {importReport && (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '4px',
                padding: '12px 14px',
                fontSize: '12.5px',
                marginBottom: '16px',
                color: '#166534',
              }}
            >
              <div style={{ fontWeight: 600 }}>Import Summary:</div>
              <div>• Total Processed: {importReport.total_processed || 0}</div>
              <div>• Successfully Created: {importReport.created_count || 0}</div>
              <div>• Duplicates / Skipped: {importReport.skipped_count || 0}</div>
              {importReport.errors && importReport.errors.length > 0 && (
                <div style={{ color: '#dc2626', marginTop: '6px' }}>
                  Errors ({importReport.errors.length}): {importReport.errors.join(', ')}
                </div>
              )}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsImportModalOpen(false)}
              style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 500, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '4px', cursor: 'pointer' }}
            >
              Close
            </button>
            <button
              type="submit"
              disabled={importLoading || !importFile}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                borderRadius: '4px',
                cursor: importLoading || !importFile ? 'not-allowed' : 'pointer',
                opacity: importLoading || !importFile ? 0.7 : 1,
              }}
            >
              {importLoading ? 'Importing...' : 'Start Import'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Student Confirmation */}
      <Modal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)} title="Move to Recycle Bin" maxWidth="420px">
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to delete student{' '}
          <strong>
            {studentToDelete?.name} ({studentToDelete?.roll})
          </strong>
          ? This student will be moved to the Recycle Bin and can be restored later.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setStudentToDelete(null)}
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
