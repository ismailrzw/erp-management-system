import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  GraduationCap,
  Users,
  ExternalLink,
  FolderGit2,
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
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    id: null,
    name: '',
    dept: '',
    domainsInput: '',
  });
  const [teacherToDelete, setTeacherToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Supervised Projects Modal State
  const [selectedTeacherForProjects, setSelectedTeacherForProjects] = useState(null);
  const [teacherProjects, setTeacherProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);

  const navigate = useNavigate();

  const handleOpenSupervisedProjects = async (teacher) => {
    setSelectedTeacherForProjects(teacher);
    setProjectsLoading(true);
    try {
      const res = await teachersApi.getProjects(teacher.id || teacher._id);
      if (res.success && res.data) {
        const list = res.data.projects || res.data.items || (Array.isArray(res.data) ? res.data : []);
        setTeacherProjects(list);
      } else {
        setTeacherProjects([]);
      }
    } catch {
      setTeacherProjects([]);
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchTeachers = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = { deleted: false, limit: 100 };
        if (search.trim()) params.search = search.trim();
        if (selectedDept) params.dept = selectedDept;

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
    [search, selectedDept]
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
      domainsInput: Array.isArray(rawDomains) ? rawDomains.join(', ') : '',
    });
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    try {
      setActionLoading(true);
      const parsedDomains = editFormData.domainsInput
        .split(',')
        .map((d) => d.trim())
        .filter(Boolean);

      await teachersApi.update(editFormData.id, {
        name: editFormData.name.trim(),
        dept: editFormData.dept,
        domains: parsedDomains,
      });

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
          title="Teachers & Supervisors Management"
          subtitle="Manage faculty members, domain specializations, and supervisory group capacity."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Teachers', to: '/manager/teachers/view' },
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
        title="Teachers & Supervisors Management"
        subtitle="Manage faculty members, domain specializations, and supervisory group capacity."
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
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '16px 20px',
          marginBottom: '20px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: '14px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 260px' }}>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name or Email..."
              style={{
                width: '100%',
                padding: '8px 12px 8px 36px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
            <Search
              size={16}
              style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
            />
          </div>

          <div style={{ flex: '0 1 200px' }}>
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
            className="btn btn-primary btn-sm"
          >
            Search
          </button>

          <button
            type="button"
            onClick={() => {
              setSearch('');
              setSelectedDept('');
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

      {/* Teachers Table Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
        }}
      >
        <div className="table-responsive-container table-wide" style={{ borderRadius: 0 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '150px' }}>Faculty Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '180px' }}>Email</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '80px' }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '220px' }}>Expertise Domains</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '130px' }}>Active Supervision</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right', minWidth: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {teachers.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <GraduationCap size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>No teachers or supervisors found</div>
                  </td>
                </tr>
              ) : (
                teachers.map((t) => {
                  const activeCap = t.active_supervision_count || 0;
                  const isCapped = activeCap >= 4;
                  return (
                    <tr
                      key={t.id || t._id || t.email}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: '#e0f2fe',
                              color: '#0284c7',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {t.name?.charAt(0)?.toUpperCase() || 'T'}
                          </div>
                          <span>{t.name}</span>
                        </div>
                      </td>
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
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '280px' }}>
                          {t.domains && t.domains.length > 0 ? (
                            t.domains.map((dom, idx) => (
                              <span
                                key={idx}
                                style={{
                                  backgroundColor: '#f1f5f9',
                                  color: '#334155',
                                  padding: '2px 8px',
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
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                          <span
                            onClick={() => handleOpenSupervisedProjects(t)}
                            style={{
                              backgroundColor: isCapped ? '#fee2e2' : '#f0fdf4',
                              color: isCapped ? '#b91c1c' : '#15803d',
                              padding: '3px 9px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              fontWeight: 600,
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              cursor: 'pointer',
                              border: '1px solid transparent',
                              boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                            }}
                            title="Click to view supervised projects"
                          >
                            <Users size={12} />
                            {activeCap} / 4 Groups
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenSupervisedProjects(t)}
                            className="btn btn-secondary btn-sm"
                            title="View supervised project groups"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          >
                            <Users size={13} />
                            <span>Groups</span>
                          </button>
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
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit Teacher */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Teacher / Supervisor Profile">
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
              These domain tags allow student groups to filter and submit supervision requests for their projects.
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

      {/* Modal: Supervised Projects Drawer/Modal */}
      <Modal
        isOpen={!!selectedTeacherForProjects}
        onClose={() => setSelectedTeacherForProjects(null)}
        title={`Supervised Projects - ${selectedTeacherForProjects?.name || ''}`}
        maxWidth="680px"
      >
        <div style={{ marginBottom: '14px', fontSize: '13px', color: '#64748b' }}>
          Projects and student teams currently under faculty supervision ({teacherProjects.length} of 4 group capacity utilized).
        </div>

        {projectsLoading ? (
          <ContentLoader label="Loading supervised projects..." />
        ) : teacherProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94a3b8' }}>
            <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
            <div style={{ fontWeight: 600, color: '#475569', fontSize: '13.5px' }}>
              No Groups Supervised
            </div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>
              This supervisor currently has zero assigned or approved groups.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto' }}>
            {teacherProjects.map((p) => (
              <div
                key={p.id || p._id}
                style={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '14px 16px',
                  backgroundColor: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                      {p.name}
                    </span>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '1px 7px',
                        borderRadius: '10px',
                        backgroundColor: p.status === 'approved' ? '#ecfdf5' : '#f8fafc',
                        color: p.status === 'approved' ? '#059669' : '#475569',
                        border: '1px solid #cbd5e1',
                        textTransform: 'capitalize',
                      }}
                    >
                      {p.status || 'Active'}
                    </span>
                  </div>

                  <div style={{ fontSize: '12.5px', color: '#64748b', marginBottom: '6px' }}>
                    {p.project_title || 'Project title pending'}
                  </div>

                  <div style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                    Course: {p.course_name || p.course_id || 'N/A'} • Dept: {p.dept || 'CS'} • Members: {p.member_count || (p.members ? p.members.length : 1)}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedTeacherForProjects(null);
                    navigate(`/manager/groups/${p.id || p._id}`);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ flexShrink: 0 }}
                >
                  <ExternalLink size={13} />
                  <span>Open Workspace</span>
                </button>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '18px' }}>
          <button
            type="button"
            onClick={() => setSelectedTeacherForProjects(null)}
            className="btn btn-secondary"
          >
            Close
          </button>
        </div>
      </Modal>
    </div>
  );
};
