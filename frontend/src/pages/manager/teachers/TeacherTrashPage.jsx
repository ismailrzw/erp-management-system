import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RotateCcw, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { teachersApi } from '../../../api/teachersApi';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';

export const TeacherTrashPage = () => {
  const [deletedTeachers, setDeletedTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teacherToPermanentDelete, setTeacherToPermanentDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const navigate = useNavigate();

  const fetchDeleted = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await teachersApi.list({ deleted: true, limit: 100 });
      if (res.success && res.data) {
        setDeletedTeachers(res.data.items || res.data || []);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to fetch recycle bin',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        const res = await teachersApi.list({ deleted: true, limit: 100 });
        if (isMounted && res.success && res.data) {
          setDeletedTeachers(res.data.items || res.data || []);
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to fetch recycle bin',
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

  const handleRestore = async (teacher) => {
    try {
      setActionLoading(true);
      await teachersApi.restore(teacher.id || teacher._id);
      setToast({ message: `Restored ${teacher.name} successfully!`, type: 'success' });
      fetchDeleted(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to restore teacher',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!teacherToPermanentDelete) return;
    try {
      setActionLoading(true);
      await teachersApi.permanentDelete(teacherToPermanentDelete.id || teacherToPermanentDelete._id);
      setToast({ message: 'Teacher permanently deleted.', type: 'success' });
      setTeacherToPermanentDelete(null);
      fetchDeleted(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to permanently delete teacher',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  return loading ? (
    <div><ContentLoader label="Loading deleted teachers..." /></div>
  ) : (
    <div>
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <div>
          <button
            type="button"
            onClick={() => navigate('/manager/teachers/view')}
            className="btn btn-back"
            style={{ marginBottom: '10px' }}
          >
            <ArrowLeft size={16} />
            <span>Back to Active Teachers</span>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Teachers Recycle Bin
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Manage soft-deleted teachers and evaluators.
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchDeleted(true)}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>Refresh</span>
        </button>
      </div>

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
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right', minWidth: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Trash2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>Recycle Bin is Empty</div>
                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>No deleted teachers found.</div>
                  </td>
                </tr>
              ) : (
                deletedTeachers.map((t) => (
                  <tr key={t.id || t._id || t.email} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 600 }}>{t.name}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '12.5px' }}>{t.email}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{t.dept}</td>
                    <td style={{ padding: '12px 16px', color: '#475569' }}>{t.type}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleRestore(t)}
                          className="btn btn-success btn-sm"
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setTeacherToPermanentDelete(t)}
                          className="btn btn-danger-outline btn-sm"
                        >
                          <Trash2 size={13} />
                          <span>Permanent Delete</span>
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

      <Modal isOpen={!!teacherToPermanentDelete} onClose={() => setTeacherToPermanentDelete(null)} title="Permanent Deletion" maxWidth="440px">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete evaluator <strong>{teacherToPermanentDelete?.name}</strong>?
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setTeacherToPermanentDelete(null)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmPermanentDelete}
            disabled={actionLoading}
            className="btn btn-danger"
          >
            {actionLoading ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
