import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trash2, RotateCcw, ArrowLeft, RefreshCw, AlertTriangle } from 'lucide-react';
import { coursesApi } from '../../../api/coursesApi';
import { Modal } from '../../../components/ui/Modal';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';

export const CourseTrashPage = () => {
  const [deletedCourses, setDeletedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [courseToPermanentDelete, setCourseToPermanentDelete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const navigate = useNavigate();

  const fetchDeleted = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await coursesApi.list({ deleted: true, limit: 100 });
      if (res.success && res.data) {
        setDeletedCourses(res.data.items || res.data || []);
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
        const res = await coursesApi.list({ deleted: true, limit: 100 });
        if (isMounted && res.success && res.data) {
          setDeletedCourses(res.data.items || res.data || []);
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

  const handleRestore = async (course) => {
    try {
      setActionLoading(true);
      await coursesApi.restore(course.id || course._id);
      setToast({ message: `Restored ${course.name} successfully!`, type: 'success' });
      fetchDeleted(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to restore course',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmPermanentDelete = async () => {
    if (!courseToPermanentDelete) return;
    try {
      setActionLoading(true);
      await coursesApi.permanentDelete(courseToPermanentDelete.id || courseToPermanentDelete._id);
      setToast({ message: 'Course permanently deleted.', type: 'success' });
      setCourseToPermanentDelete(null);
      fetchDeleted(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to permanently delete course',
        type: 'error',
      });
    } finally {
      setActionLoading(false);
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
            onClick={() => navigate('/manager/courses/view')}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '13px',
              padding: 0,
              marginBottom: '10px',
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Active Courses</span>
          </button>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Courses Recycle Bin
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Manage soft-deleted courses.
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchDeleted(true)}
          disabled={refreshing}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            color: '#334155',
            fontSize: '13px',
            fontWeight: 500,
            cursor: refreshing ? 'not-allowed' : 'pointer',
          }}
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
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13.5px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Course Name</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Dept</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600 }}>Group Limits</th>
                <th style={{ padding: '12px 16px', color: '#475569', fontWeight: 600, textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {deletedCourses.length === 0 ? (
                <tr>
                  <td colSpan={4} style={{ padding: '36px 20px', textAlign: 'center', color: '#94a3b8' }}>
                    <Trash2 size={36} style={{ margin: '0 auto 10px', opacity: 0.4 }} />
                    <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>Recycle Bin is Empty</div>
                    <div style={{ fontSize: '12.5px', marginTop: '4px' }}>No deleted courses found.</div>
                  </td>
                </tr>
              ) : (
                deletedCourses.map((c) => (
                  <tr key={c.id || c._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', color: '#dc2626', fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '12px 16px', color: '#1e293b' }}>{c.dept}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b' }}>
                      {c.min_group || 1} – {c.max_group || 4} members
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '8px' }}>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => handleRestore(c)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            backgroundColor: '#eafbf1',
                            color: '#16a34a',
                            border: '1px solid #bcf0d2',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
                        >
                          <RotateCcw size={13} />
                          <span>Restore</span>
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading}
                          onClick={() => setCourseToPermanentDelete(c)}
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            backgroundColor: '#fdecea',
                            color: '#dc2626',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 600,
                            cursor: 'pointer',
                          }}
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

      <Modal isOpen={!!courseToPermanentDelete} onClose={() => setCourseToPermanentDelete(null)} title="Permanent Deletion" maxWidth="440px">
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', marginBottom: '20px' }}>
          <AlertTriangle size={24} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5 }}>
            Are you sure you want to permanently delete course <strong>{courseToPermanentDelete?.name}</strong>?
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setCourseToPermanentDelete(null)}
            style={{ padding: '8px 14px', fontSize: '13px', fontWeight: 500, border: '1px solid #cbd5e1', backgroundColor: '#ffffff', color: '#475569', borderRadius: '4px', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmPermanentDelete}
            disabled={actionLoading}
            style={{ padding: '8px 16px', fontSize: '13px', fontWeight: 600, border: 'none', backgroundColor: '#dc2626', color: '#ffffff', borderRadius: '4px', cursor: actionLoading ? 'not-allowed' : 'pointer' }}
          >
            {actionLoading ? 'Deleting...' : 'Permanently Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
