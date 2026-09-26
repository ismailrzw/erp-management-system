import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Trash2,
  Edit2,
  RefreshCw,
  Award,
  Building,
  Briefcase,
} from 'lucide-react';
import { evaluatorsApi } from '../../../api/evaluatorsApi';
import { departmentsApi } from '../../../api/departmentsApi';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ContentLoader } from '../../../components/ui/ContentLoader';

export const EvaluatorListPage = () => {
  const [evaluators, setEvaluators] = useState([]);
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
    evaluator_type: 'internal',
    domainsInput: '',
  });
  const [evaluatorToDelete, setEvaluatorToDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const navigate = useNavigate();

  const fetchEvaluators = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = { deleted: false };
        if (search.trim()) params.search = search.trim();
        if (selectedDept) params.dept = selectedDept;
        if (selectedType) params.evaluator_type = selectedType;

        const res = await evaluatorsApi.list(params);
        if (res.success && res.data) {
          setEvaluators(res.data.items || res.data || []);
        }
      } catch (err) {
        setToast({
          message: err.response?.data?.message || 'Failed to fetch evaluators',
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
        const [eRes, dRes] = await Promise.all([
          evaluatorsApi.list({ deleted: false }),
          departmentsApi.list({ deleted: false, limit: 100 }),
        ]);

        if (isMounted) {
          if (eRes.success && eRes.data) setEvaluators(eRes.data.items || eRes.data || []);
          if (dRes.success && dRes.data) setDepartments(dRes.data.items || dRes.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to load evaluators',
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
    fetchEvaluators(true);
  };

  const handleOpenEdit = (ev) => {
    const rawDomains = ev.domains || [];
    setEditFormData({
      id: ev.id || ev._id,
      name: ev.name,
      dept: ev.dept || 'CS',
      evaluator_type: ev.evaluator_type || 'internal',
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

      await evaluatorsApi.update(editFormData.id, {
        name: editFormData.name.trim(),
        dept: editFormData.dept,
        evaluator_type: editFormData.evaluator_type,
        domains: parsedDomains,
      });

      setToast({ message: 'Evaluator details updated successfully', type: 'success' });
      setIsEditModalOpen(false);
      fetchEvaluators(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to update evaluator',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!evaluatorToDelete) return;
    try {
      setActionLoading(true);
      await evaluatorsApi.delete(evaluatorToDelete.id || evaluatorToDelete._id);
      setToast({ message: 'Evaluator moved to Recycle Bin', type: 'success' });
      setEvaluatorToDelete(null);
      fetchEvaluators(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to delete evaluator',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing && evaluators.length === 0) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Project Exhibition Evaluators"
          subtitle="Manage internal faculty and external industry experts invited for Showcase Day evaluations."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Evaluators', to: '/manager/evaluators' },
            { label: 'View All Evaluators' },
          ]}
        />
        <ContentLoader label="Loading evaluators..." />
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
        title="Project Exhibition Evaluators"
        subtitle="Manage internal faculty and external industry experts invited for Showcase Day evaluations."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Evaluators', to: '/manager/evaluators' },
          { label: 'View All Evaluators' },
        ]}
      >
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={() => navigate('/manager/evaluators/add')}
            className="btn btn-primary"
          >
            <Plus size={15} />
            <span>Add New Evaluator</span>
          </button>
          <button
            type="button"
            onClick={() => navigate('/manager/evaluators/trash')}
            className="btn btn-secondary"
          >
            <Trash2 size={15} />
            <span>Recycle Bin</span>
          </button>
          <button
            type="button"
            onClick={() => fetchEvaluators(true)}
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
              <option value="">All Evaluator Types</option>
              <option value="internal">Internal (University)</option>
              <option value="external">External (Industry)</option>
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
              fetchEvaluators(true);
            }}
            disabled={refreshing}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Reset</span>
          </button>
        </form>
      </div>

      {/* Evaluators Table Card */}
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
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '150px' }}>Evaluator Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '180px' }}>Email</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '80px' }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '130px' }}>Type</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '200px' }}>Expertise Domains</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, minWidth: '120px' }}>Assigned Groups</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right', minWidth: '110px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {evaluators.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Award size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>No exhibition evaluators found</div>
                  </td>
                </tr>
              ) : (
                evaluators.map((ev) => {
                  const isExternal = ev.evaluator_type === 'external';
                  return (
                    <tr
                      key={ev.id || ev._id || ev.email}
                      style={{ borderBottom: '1px solid #f1f5f9' }}
                    >
                      <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: isExternal ? '#fef3c7' : '#e0e7ff',
                              color: isExternal ? '#b45309' : '#4338ca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0,
                            }}
                          >
                            {isExternal ? <Briefcase size={15} /> : <Building size={15} />}
                          </div>
                          <span>{ev.name}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px' }}>{ev.email}</td>
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
                          {ev.dept || 'CS'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span
                          style={{
                            backgroundColor: isExternal ? '#fef3c7' : '#ecfdf5',
                            color: isExternal ? '#b45309' : '#047857',
                            padding: '3px 9px',
                            borderRadius: '12px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          {isExternal ? 'External Industry' : 'Internal Faculty'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', maxWidth: '240px' }}>
                          {ev.domains && ev.domains.length > 0 ? (
                            ev.domains.map((dom, idx) => (
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
                        <span
                          style={{
                            backgroundColor: '#f8fafc',
                            color: '#475569',
                            padding: '3px 8px',
                            borderRadius: '10px',
                            fontSize: '11.5px',
                            fontWeight: 600,
                            border: '1px solid #e2e8f0',
                          }}
                        >
                          {ev.assigned_groups_count || 0} Groups
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(ev)}
                            className="btn btn-ghost btn-sm"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setEvaluatorToDelete(ev)}
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

      {/* Modal: Edit Evaluator */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Exhibition Evaluator">
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
              Evaluator Type *
            </label>
            <select
              value={editFormData.evaluator_type}
              onChange={(e) => setEditFormData({ ...editFormData, evaluator_type: e.target.value })}
              required
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 34px 8px 12px', fontSize: '13.5px', outline: 'none', backgroundColor: '#ffffff' }}
            >
              <option value="internal">Internal (University Faculty)</option>
              <option value="external">External (Industry Expert)</option>
            </select>
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Specialization & Evaluation Domains (Comma-separated)
            </label>
            <input
              type="text"
              value={editFormData.domainsInput}
              onChange={(e) => setEditFormData({ ...editFormData, domainsInput: e.target.value })}
              placeholder="e.g. Quality Assurance, Cloud Architecture, UX Evaluation"
              style={{ width: '100%', border: '1px solid #cbd5e1', borderRadius: '4px', padding: '8px 12px', fontSize: '13.5px', outline: 'none' }}
            />
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
      <Modal isOpen={!!evaluatorToDelete} onClose={() => setEvaluatorToDelete(null)} title="Move to Recycle Bin" maxWidth="420px">
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to move evaluator <strong>{evaluatorToDelete?.name}</strong> to the Recycle Bin?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setEvaluatorToDelete(null)}
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
