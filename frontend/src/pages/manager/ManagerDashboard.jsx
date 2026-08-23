import { useState, useEffect, useCallback } from 'react';
import {
  RefreshCw,
  Plus,
  FileText,
  Download,
  Trash2,
  Upload,
  Megaphone,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboardApi';
import { announcementsApi } from '../../api/announcementsApi';
import { attachmentsApi } from '../../api/attachmentsApi';
import { StatCard } from '../../components/ui/StatCard';
import { AccordionItem } from '../../components/ui/Accordion';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { Preloader } from '../../components/ui/Preloader';
import { formatDate } from '../../utils/dateUtils';
import { formatFileSize } from '../../utils/fileUtils';

export const ManagerDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Announcement Modal States
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annFormData, setAnnFormData] = useState({ id: null, title: '', content: '' });
  const [annLoading, setAnnLoading] = useState(false);

  // Delete Announcement Modal
  const [annToDelete, setAnnToDelete] = useState(null);

  // Attachment Modal States
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [attFormData, setAttFormData] = useState({ title: '', file: null });
  const [attLoading, setAttLoading] = useState(false);

  // Delete Attachment Modal
  const [attToDelete, setAttToDelete] = useState(null);

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await dashboardApi.getManagerDashboard();
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load dashboard data',
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
        const res = await dashboardApi.getManagerDashboard();
        if (isMounted && res.success && res.data) {
          setData(res.data);
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to load dashboard data',
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

  // Announcement Handlers
  const handleOpenNewAnnouncement = () => {
    setAnnFormData({ id: null, title: '', content: '' });
    setIsAnnModalOpen(true);
  };

  const handleOpenEditAnnouncement = (ann) => {
    setAnnFormData({ id: ann.id || ann._id, title: ann.title, content: ann.content || '' });
    setIsAnnModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!annFormData.title.trim()) return;

    try {
      setAnnLoading(true);
      if (annFormData.id) {
        await announcementsApi.update(annFormData.id, {
          title: annFormData.title.trim(),
          content: annFormData.content.trim(),
        });
        setToast({ message: 'Announcement updated successfully', type: 'success' });
      } else {
        await announcementsApi.create({
          title: annFormData.title.trim(),
          content: annFormData.content.trim(),
        });
        setToast({ message: 'Announcement created successfully', type: 'success' });
      }
      setIsAnnModalOpen(false);
      fetchDashboardData(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to save announcement',
        type: 'error',
      });
    } finally {
      setAnnLoading(false);
    }
  };

  const handleConfirmDeleteAnnouncement = async () => {
    if (!annToDelete) return;
    try {
      setAnnLoading(true);
      await announcementsApi.delete(annToDelete.id || annToDelete._id);
      setToast({ message: 'Announcement removed successfully', type: 'success' });
      setAnnToDelete(null);
      fetchDashboardData(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to remove announcement',
        type: 'error',
      });
    } finally {
      setAnnLoading(false);
    }
  };

  // Attachment Handlers
  const handleSaveAttachment = async (e) => {
    e.preventDefault();
    if (!attFormData.title.trim() || !attFormData.file) {
      setToast({ message: 'Please provide both title and a file', type: 'error' });
      return;
    }

    try {
      setAttLoading(true);
      const fd = new FormData();
      fd.append('title', attFormData.title.trim());
      fd.append('file', attFormData.file);

      await attachmentsApi.upload(fd);
      setToast({ message: 'Attachment uploaded successfully', type: 'success' });
      setIsAttModalOpen(false);
      setAttFormData({ title: '', file: null });
      fetchDashboardData(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to upload attachment',
        type: 'error',
      });
    } finally {
      setAttLoading(false);
    }
  };

  const handleConfirmDeleteAttachment = async () => {
    if (!attToDelete) return;
    try {
      setAttLoading(true);
      await attachmentsApi.delete(attToDelete.id || attToDelete._id);
      setToast({ message: 'Attachment removed successfully', type: 'success' });
      setAttToDelete(null);
      fetchDashboardData(true);
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to delete attachment',
        type: 'error',
      });
    } finally {
      setAttLoading(false);
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
          marginBottom: '24px',
        }}
      >
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
            Dashboard
          </h1>
          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            <span>Home</span> <span style={{ margin: '0 4px' }}>/</span>{' '}
            <span style={{ color: '#0073aa', fontWeight: 500 }}>Dashboard</span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
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
            borderRadius: '4px',
            color: '#334155',
            cursor: refreshing ? 'not-allowed' : 'pointer',
            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
          }}
        >
          <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '16px',
          marginBottom: '24px',
        }}
      >
        <StatCard
          title="Total Created Groups"
          count={data?.total_groups}
          iconName="layers"
          variant="primary"
        />
        <StatCard
          title="Total Evaluators"
          count={data?.total_evaluators}
          iconName="teacher"
          variant="success"
        />
        <StatCard
          title="Remaining to Evaluate"
          count={data?.groups_remaining_evaluation}
          iconName="clock"
          variant="warning"
        />
        <StatCard
          title="Total Students"
          count={data?.total_students}
          iconName="users"
          variant="info"
        />
        <StatCard
          title="Students Without a Group"
          count={data?.students_without_group}
          iconName="bell"
          variant="warning"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))',
          gap: '20px',
        }}
      >
        {/* Left: Announcements */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '3px solid #0073aa',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Megaphone size={18} color="#0073aa" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                Announcements
              </h2>
            </div>
            <button
              type="button"
              onClick={handleOpenNewAnnouncement}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '5px 10px',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {!data?.announcements || data.announcements.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  color: '#94a3b8',
                }}
              >
                <Megaphone size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>
                  No announcements yet
                </div>
                <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                  Publish an announcement to keep everyone informed.
                </div>
              </div>
            ) : (
              data.announcements.map((ann) => (
                <AccordionItem
                  key={ann.id || ann._id}
                  announcement={ann}
                  onEdit={handleOpenEditAnnouncement}
                  onDelete={() => setAnnToDelete(ann)}
                />
              ))
            )}
          </div>
        </div>

        {/* Right: Attachments */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '6px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '3px solid #5faee3',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#5faee3" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                Attachments
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setIsAttModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                fontWeight: 600,
                padding: '5px 10px',
                backgroundColor: '#5faee3',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              <Upload size={14} />
              <span>Upload</span>
            </button>
          </div>

          <div style={{ padding: '16px 20px' }}>
            {!data?.attachments || data.attachments.length === 0 ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '36px 20px',
                  color: '#94a3b8',
                }}
              >
                <FileText size={36} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
                <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>
                  No attachments
                </div>
                <div style={{ fontSize: '12.5px', marginTop: '4px' }}>
                  Upload a file to share with students and evaluators.
                </div>
              </div>
            ) : (
              data.attachments.map((att) => (
                <div
                  key={att.id || att._id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 14px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '6px',
                    marginBottom: '10px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '6px',
                        backgroundColor: '#eef6fb',
                        color: '#0073aa',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <FileText size={18} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '13.5px' }}>
                        {att.title || att.filename}
                      </div>
                      <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '2px' }}>
                        {att.filename && <span>{att.filename} · </span>}
                        {att.size && <span>{formatFileSize(att.size)} · </span>}
                        <span>{formatDate(att.uploaded_at || att.created_at)}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      type="button"
                      onClick={() => attachmentsApi.download(att.id || att._id)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#64748b',
                        padding: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      title="Download File"
                    >
                      <Download size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttToDelete(att)}
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#dc2626',
                        padding: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      title="Delete Attachment"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal: New / Edit Announcement */}
      <Modal
        isOpen={isAnnModalOpen}
        onClose={() => setIsAnnModalOpen(false)}
        title={annFormData.id ? 'Edit Announcement' : 'Create New Announcement'}
      >
        <form onSubmit={handleSaveAnnouncement}>
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Title *
            </label>
            <input
              type="text"
              value={annFormData.title}
              onChange={(e) => setAnnFormData({ ...annFormData, title: e.target.value })}
              placeholder="e.g. Sprint 1 Progress Reviews"
              required
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Content
            </label>
            <textarea
              rows={4}
              value={annFormData.content}
              onChange={(e) => setAnnFormData({ ...annFormData, content: e.target.value })}
              placeholder="Enter announcement description..."
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '13.5px',
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAnnModalOpen(false)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={annLoading}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                borderRadius: '4px',
                cursor: annLoading ? 'not-allowed' : 'pointer',
                opacity: annLoading ? 0.7 : 1,
              }}
            >
              {annLoading ? 'Saving...' : annFormData.id ? 'Save Changes' : 'Publish'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Announcement Confirmation */}
      <Modal
        isOpen={!!annToDelete}
        onClose={() => setAnnToDelete(null)}
        title="Remove Announcement"
        maxWidth="420px"
      >
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to permanently remove announcement{' '}
          <strong>"{annToDelete?.title}"</strong>? This action cannot be undone.
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setAnnToDelete(null)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteAnnouncement}
            disabled={annLoading}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              borderRadius: '4px',
              cursor: annLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {annLoading ? 'Removing...' : 'Remove'}
          </button>
        </div>
      </Modal>

      {/* Modal: Upload Attachment */}
      <Modal
        isOpen={isAttModalOpen}
        onClose={() => setIsAttModalOpen(false)}
        title="Upload Attachment"
      >
        <form onSubmit={handleSaveAttachment}>
          <div style={{ marginBottom: '14px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Attachment Title *
            </label>
            <input
              type="text"
              value={attFormData.title}
              onChange={(e) => setAttFormData({ ...attFormData, title: e.target.value })}
              placeholder="e.g. Project Proposal Guidelines"
              required
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '13.5px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 500,
                color: '#334155',
                marginBottom: '5px',
              }}
            >
              Select File (.pdf, .docx, .xlsx, .zip) *
            </label>
            <input
              type="file"
              accept=".pdf,.docx,.xlsx,.zip"
              onChange={(e) => setAttFormData({ ...attFormData, file: e.target.files[0] })}
              required
              style={{
                width: '100%',
                fontSize: '13px',
                color: '#475569',
              }}
            />
            <div style={{ fontSize: '11.5px', color: '#94a3b8', marginTop: '4px' }}>
              Maximum file size: 10 MB
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setIsAttModalOpen(false)}
              style={{
                padding: '8px 14px',
                fontSize: '13px',
                fontWeight: 500,
                border: '1px solid #cbd5e1',
                backgroundColor: '#ffffff',
                color: '#475569',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={attLoading}
              style={{
                padding: '8px 16px',
                fontSize: '13px',
                fontWeight: 600,
                border: 'none',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                borderRadius: '4px',
                cursor: attLoading ? 'not-allowed' : 'pointer',
                opacity: attLoading ? 0.7 : 1,
              }}
            >
              {attLoading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Delete Attachment Confirmation */}
      <Modal
        isOpen={!!attToDelete}
        onClose={() => setAttToDelete(null)}
        title="Delete Attachment"
        maxWidth="420px"
      >
        <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.5, marginBottom: '20px' }}>
          Are you sure you want to permanently delete file{' '}
          <strong>"{attToDelete?.title || attToDelete?.filename}"</strong>?
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setAttToDelete(null)}
            style={{
              padding: '8px 14px',
              fontSize: '13px',
              fontWeight: 500,
              border: '1px solid #cbd5e1',
              backgroundColor: '#ffffff',
              color: '#475569',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteAttachment}
            disabled={attLoading}
            style={{
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              border: 'none',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              borderRadius: '4px',
              cursor: attLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {attLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  );
};
