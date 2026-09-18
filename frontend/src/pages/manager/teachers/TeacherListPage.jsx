import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  GraduationCap,
} from 'lucide-react';
import { teachersApi } from '../../../api/teachersApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { supervisorsApi } from '../../../api/supervisorsApi';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ContentLoader } from '../../../components/ui/ContentLoader';

export const TeacherListPage = () => {
  const [teachers, setTeachers] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    dept: '',
    type: 'Internal Faculty',
    domainsInput: '',
  });
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const fetchTeachers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = { deleted: false, limit: 100 };
        if (search.trim()) params.search = search.trim();
        if (selectedDept) params.dept = selectedDept;
        if (selectedType) params.type = selectedType;

        const res = await teachersApi.list(params);
        if (res.success && res.data) {
          setTeachers(res.data.items || res.data || []);
        }
      } catch (err) {
        setToast({
          message: err.response?.data?.message || 'Failed to fetch teachers',
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search, selectedDept, selectedType]
  );

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const [tRes, dRes] = await Promise.all([
          teachersApi.list({ deleted: false, limit: 100 }),
          departmentsApi.list({ deleted: false, limit: 100 }),
        ]);

        if (isMounted) {
          if (tRes.success && tRes.data) setTeachers(tRes.data.items || tRes.data || []);
          if (dRes.success && dRes.data) setDepartments(dRes.data.items || dRes.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to load teachers',
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
    fetchTeachers(true);
  };

  const handleOpenEdit = (teacher) => {
    const rawDomains = teacher.domains || [];
    setEditFormData({
      id: teacher.id || teacher._id,
      name: teacher.name,
      dept: teacher.dept || 'CS',
      type: teacher.type || 'Internal Faculty',
      domainsInput: Array.isArray(rawDomains) ? rawDomains.join(', ') : '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      await teachersApi.update(editFormData.id, {
        name: editFormData.name.trim(),
        dept: editFormData.dept,
        type: editFormData.type,
      });

      const parsedDomains = editFormData.domainsInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);
      await supervisorsApi.updateTeacherDomains(editFormData.id, parsedDomains);

      setToast({ message: 'Teacher profile and expertise domains updated', type: 'success' });
      setIsEditModalOpen(false);
      fetchTeachers(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to update teacher',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!teacherToDelete) return;
    try {
      setActionLoading(true);
      await teachersApi.delete(teacherToDelete.id || teacherToDelete._id);
      setToast({ message: 'Teacher moved to Recycle Bin', type: 'success' });
      setTeacherToDelete(null);
      fetchTeachers(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to delete teacher',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing && teachers.length === 0) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Teachers & Evaluators Management"
          subtitle="Manage faculty members, evaluators, and supervisory capacity."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Teachers', to: '/manager/teachers' },
            { label: 'View All Faculty' },
          ]}
        />
        <ContentLoader label="Loading teachers..." />
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
        title="Teachers & Evaluators Management"
        subtitle="Manage faculty members, evaluators, and supervisory capacity."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Teachers', to: '/manager/teachers' },
          { label: 'View All Faculty' },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/manager/teachers/add')}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Add New Teacher</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/manager/teachers/trash')}
            className="btn btn-secondary"
          >
            <Trash2 size={15} />
            <span>Recycle Bin</span>
          </button>
          <button
            type="button"
            onClick={() => fetchTeachers(true)}
            disabled={refreshing}
            className="btn btn-ghost btn-sm"
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
              placeholder="Search by Name or Email..."
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

          <div style={{ flex: '0 1 180px' }}>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
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
              <option value="">All Faculty Types</option>
              <option value="Internal Faculty">Internal Faculty</option>
              <option value="External Industry">External Industry</option>
            </select>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-sm"
          >
            Search
          </button>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedDept('');
              setSelectedType('');
              fetchTeachers(true);
            }}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Reset</span>
          </button>
        </form>
      </div>

      {/* Teachers Table */}
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
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '130px' }}>Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '160px' }}>Email</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '70px' }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '110px' }}>Faculty Type</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '150px' }}>Expertise / Domains</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '100px' }}>Supervising</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right', minWidth: '100px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <GraduationCap size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>No teachers or evaluators found</div>
                  </td>
                </tr>
              ) : (
                teachers.map((t) => (
                  <tr
                    key={t.id || t._id || t.email}
                    style={{ borderBottom: '1px solid #f1f5f9' }}
                  >
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{t.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px' }}>{t.email}</td>
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
                        {t.dept || 'CS'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: t.type === 'External Industry' ? '#fef3c7' : '#ecfdf5',
                          color: t.type === 'External Industry' ? '#b45309' : '#047857',
                          padding: '3px 8px',
                          borderRadius: '4px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                      >
                        {t.type || 'Internal Faculty'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', maxWidth: '240px' }}>
                        {t.domains && t.domains.length > 0 ? (
                          t.domains.map((dom, idx) => (
                            <span
                              key={idx}
                              style={{
                                backgroundColor: '#f1f5f9',
                                color: '#334155',
                                padding: '2px 7px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              {dom}
                            </span>
                          ))
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '12px', fontStyle: 'italic' }}>None set</span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          backgroundColor: (t.active_supervision_count || 0) >= 4 ? '#fee2e2' : '#f0fdf4',
                          color: (t.active_supervision_count || 0) >= 4 ? '#b91c1c' : '#15803d',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                        }}
                      >
                        {t.active_supervision_count || 0} / 4
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(t)}
                          className="btn btn-ghost btn-sm"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setTeacherToDelete(t)}
                          className="btn btn-danger-outline btn-sm"
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

      {/* Modal: Edit Teacher */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Teacher / Evaluator">
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

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Faculty / Evaluator Type *
            </label>
            <select
              value={editFormData.type}
              onChange={(e) => setEditFormData({ ...editFormData, type: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 34px 8px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
            >
              <option value="Internal Faculty">Internal Faculty</option>
              <option value="External Industry">External Industry</option>
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Expertise & Domains (Comma-separated)
            </label>
            <input
              type="text"
              value={editFormData.domainsInput}
              onChange={(e) => setEditFormData({ ...editFormData, domainsInput: e.target.value })}
              placeholder="e.g. Machine Learning, Cloud Computing, Web Systems"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
            />
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
              These domain tags allow students to filter and discover suitable supervisors for their FYP.
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="btn btn-primary"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal isOpen={!!teacherToDelete} onClose={() => setTeacherToDelete(null)} title="Move to Recycle Bin" maxWidth="420px">
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to delete teacher <strong>{teacherToDelete?.name}</strong>?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setTeacherToDelete(null)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDelete}
            disabled={actionLoading}
            className="btn btn-danger"
          >
            {actionLoading ? 'Deleting...' : 'Move to Trash'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
