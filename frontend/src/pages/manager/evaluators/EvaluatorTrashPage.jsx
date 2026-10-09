import { useState, useEffect, useCallback } from 'react';
import { Trash2, RotateCcw, Search, RefreshCw, AlertTriangle } from 'lucide-react';
import { evaluatorsApi } from '../../../api/evaluatorsApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { BackButton } from '../../../components/ui/BackButton';

export const EvaluatorTrashPage = () => {
  const [deletedEvaluators, setDeletedEvaluators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const [evaluatorToRestore, setEvaluatorToRestore] = useState(null);
  const [evaluatorToPermanentDelete, setEvaluatorToPermanentDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDeleted = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true);
      try {
        const params = { deleted: true };
        if (search.trim()) params.search = search.trim();
        const res = await evaluatorsApi.list(params);
        if (res.success && res.data) {
          setDeletedEvaluators(res.data.items || res.data || []);
        }
      } catch (err) {
        setToast({
          message: err.response?.data?.message || 'Failed to fetch deleted evaluators',
          type: 'error',
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchDeleted();
  }, [fetchDeleted]);

  const handleRestore = async () => {
    if (!evaluatorToRestore) return;
    try {
      setActionLoading(true);
      await evaluatorsApi.restore(evaluatorToRestore.id || evaluatorToRestore._id);
      setToast({ message: 'Evaluator restored successfully!', type: 'success' });
      setEvaluatorToRestore(null);
      fetchDeleted(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to restore evaluator',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!evaluatorToPermanentDelete) return;
    try {
      setActionLoading(true);
      await evaluatorsApi.permanentDelete(evaluatorToPermanentDelete.id || evaluatorToPermanentDelete._id);
      setToast({ message: 'Evaluator permanently deleted.', type: 'info' });
      setEvaluatorToPermanentDelete(null);
      fetchDeleted(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to permanently delete evaluator',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Evaluators Recycle Bin"
          subtitle="Restore or permanently delete archived project evaluators."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Evaluators', to: '/manager/evaluators/view' },
            { label: 'Recycle Bin' },
          ]}
        />
        <ContentLoader label="Loading recycle bin..." />
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

      <BackButton to="/manager/evaluators/view" label="Back to Evaluators" />

      <PageHeader
        title="Evaluators Recycle Bin"
        subtitle="Restore or permanently delete archived project evaluators."
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Evaluators', to: '/manager/evaluators/view' },
          { label: 'Recycle Bin' },
        ]}
      />

      {/* Search & Actions */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '14px 18px',
          marginBottom: '20px',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 240px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search deleted evaluators..."
            style={{
              width: '100%',
              padding: '8px 12px 8px 36px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
        </div>

        <button
          type="button"
          onClick={() => fetchDeleted(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Table */}
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
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Email</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedEvaluators.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Trash2 size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>Recycle bin is empty</div>
                  </td>
                </tr>
              ) : (
                deletedEvaluators.map((ev) => (
                  <tr key={ev.id || ev._id || ev.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>{ev.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>{ev.email}</td>
                    <td style={{ padding: '12px 16px' }}>{ev.dept || 'CS'}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ fontSize: '11.5px', fontWeight: 600, color: ev.evaluator_type === 'external' ? '#b45309' : '#047857' }}>
                        {ev.evaluator_type === 'external' ? 'External Industry' : 'Internal Faculty'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => setEvaluatorToRestore(ev)}
                          className="btn btn-secondary btn-sm"
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEvaluatorToPermanentDelete(ev)}
                          className="btn btn-danger-outline btn-sm"
                        >
                          <Trash2 size={13} />
                          <span>Delete Forever</span>
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

      {/* Modal: Restore */}
      <Modal isOpen={!!evaluatorToRestore} onClose={() => setEvaluatorToRestore(null)} title="Restore Evaluator" maxWidth="420px">
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to restore evaluator <strong>{evaluatorToRestore?.name}</strong>?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={() => setEvaluatorToRestore(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handleRestore} disabled={actionLoading} className="btn btn-primary">
            {actionLoading ? 'Restoring...' : 'Restore'}
          </button>
        </div>
      </Modal>

      {/* Modal: Permanent Delete */}
      <Modal isOpen={!!evaluatorToPermanentDelete} onClose={() => setEvaluatorToPermanentDelete(null)} title="Permanent Delete Warning" maxWidth="420px">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '16px' }}>
          <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0 }} />
          <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            This action cannot be undone. Evaluator <strong>{evaluatorToPermanentDelete?.name}</strong> will be permanently purged from the system.
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={() => setEvaluatorToPermanentDelete(null)} className="btn btn-secondary">
            Cancel
          </button>
          <button type="button" onClick={handlePermanentDelete} disabled={actionLoading} className="btn btn-danger">
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
