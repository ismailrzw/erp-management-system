import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  RefreshCw,
  Plus,
  FileText,
  Download,
  Trash2,
  Upload,
  Megaphone,
  Search,
  X,
  Edit2,
} from 'lucide-react';
import { dashboardApi } from '../../api/dashboardApi';
import { announcementsApi } from '../../api/announcementsApi';
import { attachmentsApi } from '../../api/attachmentsApi';
import { departmentsApi } from '../../api/departmentsApi';
import { StatCard } from '../../components/ui/StatCard';
import { PageHeader } from '../../components/ui/PageHeader';
import { AccordionItem } from '../../components/ui/Accordion';
import { Modal } from '../../components/ui/Modal';
import { Toast } from '../../components/ui/Toast';
import { ContentLoader } from '../../components/ui/ContentLoader';
import { formatDate } from '../../utils/dateUtils';
import { formatFileSize } from '../../utils/fileUtils';

export const ManagerDashboard = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Dropdown reference data
  const [departments, setDepartments] = useState([]);

  // Announcement Modal States
  const [isAnnModalOpen, setIsAnnModalOpen] = useState(false);
  const [annFormData, setAnnFormData] = useState({
    id: null,
    title: '',
    content: '',
    scope: 'broadcast',
    target_dept: '',
    target_groups: '',
  });
  const [annLoading, setAnnLoading] = useState(false);
  const [annSearch, setAnnSearch] = useState('');
  const [annFilterMode, setAnnFilterMode] = useState('recent'); // 'recent' | 'all'

  // Delete Announcement Modal
  const [annToDelete, setAnnToDelete] = useState(null);

  // Attachment Modal States
  const [isAttModalOpen, setIsAttModalOpen] = useState(false);
  const [attFormData, setAttFormData] = useState({ title: '', file: null });
  const [attLoading, setAttLoading] = useState(false);

  // Edit Attachment Modal States
  const [attToEdit, setAttToEdit] = useState(null);
  const [attEditTitle, setAttEditTitle] = useState('');
  const [attEditLoading, setAttEditLoading] = useState(false);
  const [attEditError, setAttEditError] = useState('');

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
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    const loadRefData = async () => {
      try {
        const dRes = await departmentsApi.list({ limit: 100, deleted: false });
        if (dRes.success && dRes.data) {
          setDepartments(dRes.data.items || dRes.data || []);
        }
      } catch {
        // Fallbacks
      }
    };
    loadRefData();
  }, []);

  // Announcement Handlers
  const handleOpenNewAnnouncement = () => {
    setAnnFormData({
      id: null,
      title: '',
      content: '',
      scope: 'broadcast',
      target_dept: '',
      target_groups: '',
    });
    setIsAnnModalOpen(true);
  };

  const handleOpenEditAnnouncement = (ann) => {
    let targetDept = '';
    let targetGroups = '';
    if (ann.scope === 'department' && ann.target_ids && ann.target_ids.length > 0) {
      targetDept = ann.target_ids[0];
    } else if (ann.scope === 'group' && ann.target_ids) {
      targetGroups = ann.target_ids.join(', ');
    }

    setAnnFormData({
      id: ann.id || ann._id,
      title: ann.title,
      content: ann.content || '',
      scope: ann.scope || 'broadcast',
      target_dept: targetDept,
      target_groups: targetGroups,
    });
    setIsAnnModalOpen(true);
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (!annFormData.title.trim()) return;

    try {
      setAnnLoading(true);
      let target_ids = [];
      if (annFormData.scope === 'department') {
        target_ids = annFormData.target_dept ? [annFormData.target_dept.trim()] : [];
      } else if (annFormData.scope === 'group') {
        target_ids = annFormData.target_groups
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }

      const payload = {
        title: annFormData.title.trim(),
        content: annFormData.content.trim(),
        scope: annFormData.scope,
        target_ids,
      };

      if (annFormData.id) {
        await announcementsApi.update(annFormData.id, payload);
        setToast({ message: 'Announcement updated successfully', type: 'success' });
      } else {
        await announcementsApi.create(payload);
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
      setToast({ message: 'Attachment deleted successfully', type: 'success' });
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

  const handleOpenEditAttachment = (att) => {
    setAttToEdit(att);
    setAttEditTitle(att.title || '');
    setAttEditError('');
  };

  const handleSaveEditAttachment = async (e) => {
    e.preventDefault();
    if (!attEditTitle.trim()) {
      setAttEditError('Attachment title cannot be empty.');
      return;
    }

    try {
      setAttEditLoading(true);
      setAttEditError('');
      const attId = attToEdit.id || attToEdit._id;
      const res = await attachmentsApi.update(attId, { title: attEditTitle.trim() });
      if (res.success) {
        setToast({ message: 'Attachment title updated successfully', type: 'success' });
        setAttToEdit(null);
        fetchDashboardData(true);
      }
    } catch (err) {
      setAttEditError(err.response?.data?.message || 'Failed to update attachment title');
    } finally {
      setAttEditLoading(false);
    }
  };

  if (loading && !refreshing && !data) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Dashboard"
          subtitle="Overview of Project-Based Learning operations, announcements, and course attachments."
          breadcrumbs={[{ label: 'Home' }, { label: 'Dashboard' }]}
        />
        <ContentLoader label="Loading manager dashboard..." />
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

      <PageHeader
        title="Dashboard"
        subtitle="Overview of Project-Based Learning operations, announcements, and course attachments."
        breadcrumbs={[{ label: 'Home' }, { label: 'Dashboard' }]}
      >
        <button
          type="button"
          onClick={() => fetchDashboardData(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </PageHeader>

      <div className="stat-grid-responsive">
        <StatCard
          title="Total Created Groups"
          count={data?.total_groups}
          iconName="layers"
          variant="primary"
          onClick={() => navigate('/manager/groups')}
          subtext="View project groups"
        />
        <StatCard
          title="Total Evaluators"
          count={data?.total_evaluators}
          iconName="teacher"
          variant="success"
          onClick={() => navigate('/manager/teachers')}
          subtext="Faculty evaluators"
        />
        <StatCard
          title="Remaining to Evaluate"
          count={data?.groups_remaining_evaluation}
          iconName="clock"
          variant="warning"
          onClick={() => navigate('/manager/groups')}
          subtext="Groups awaiting grading"
        />
        <StatCard
          title="Total Students"
          count={data?.total_students}
          iconName="users"
          variant="info"
          onClick={() => navigate('/manager/students')}
          subtext="Enrolled students"
        />
        <StatCard
          title="Students Without a Group"
          count={data?.students_without_group}
          iconName="bell"
          variant="warning"
          onClick={() => navigate('/manager/groups?tab=ungrouped')}
          subtext="Click to manage"
        />
      </div>

      <div className="dashboard-dual-grid">
        {/* Left: Announcements */}
        {(() => {
          const allAnnouncements = data?.announcements || [];
          const searchedAnnouncements = allAnnouncements.filter((ann) => {
            if (!annSearch.trim()) return true;
            const term = annSearch.toLowerCase();
            const titleMatch = (ann.title || '').toLowerCase().includes(term);
            const contentMatch = (ann.content || '').toLowerCase().includes(term);
            const dateMatch = (ann.date || ann.created_at || '').toLowerCase().includes(term);
            return titleMatch || contentMatch || dateMatch;
          });

          const isShowingRecent = annFilterMode === 'recent' && !annSearch.trim();
          const displayedAnnouncements = isShowingRecent
            ? searchedAnnouncements.slice(0, 5)
            : searchedAnnouncements;

          return (
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {/* Card Header */}
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  borderTop: '3px solid #0073aa',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Megaphone size={18} color="#0073aa" />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Announcements
                  </h2>
                  {allAnnouncements.length > 0 && (
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        backgroundColor: '#e0f2fe',
                        color: '#0369a1',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: '1px solid #bae6fd',
                      }}
                    >
                      {allAnnouncements.length}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={handleOpenNewAnnouncement}
                    className="btn btn-primary btn-sm"
                  >
                    <Plus size={14} />
                    <span>New</span>
                  </button>
                </div>
              </div>

              {/* Sub-bar: Filter Tabs & Search */}
              {allAnnouncements.length > 0 && (
                <div
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#f8fafc',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div
                    style={{
                      display: 'inline-flex',
                      backgroundColor: '#e2e8f0',
                      borderRadius: '6px',
                      padding: '2px',
                      gap: '2px',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setAnnFilterMode('recent')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: annFilterMode === 'recent' ? '#ffffff' : 'transparent',
                        color: annFilterMode === 'recent' ? '#0073aa' : '#64748b',
                        boxShadow: annFilterMode === 'recent' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      Latest ({Math.min(5, allAnnouncements.length)})
                    </button>
                    <button
                      type="button"
                      onClick={() => setAnnFilterMode('all')}
                      style={{
                        padding: '4px 10px',
                        fontSize: '11.5px',
                        fontWeight: 600,
                        borderRadius: '4px',
                        border: 'none',
                        backgroundColor: annFilterMode === 'all' ? '#ffffff' : 'transparent',
                        color: annFilterMode === 'all' ? '#0073aa' : '#64748b',
                        boxShadow: annFilterMode === 'all' ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                        cursor: 'pointer',
                      }}
                    >
                      All ({allAnnouncements.length})
                    </button>
                  </div>

                  <div
                    style={{
                      position: 'relative',
                      display: 'flex',
                      alignItems: 'center',
                      minWidth: '180px',
                    }}
                  >
                    <Search
                      size={13}
                      color="#94a3b8"
                      style={{ position: 'absolute', left: '9px', pointerEvents: 'none' }}
                    />
                    <input
                      type="text"
                      value={annSearch}
                      onChange={(e) => setAnnSearch(e.target.value)}
                      placeholder="Search announcements..."
                      style={{
                        width: '100%',
                        padding: '4px 26px 4px 28px',
                        fontSize: '12px',
                        border: '1px solid #cbd5e1',
                        borderRadius: '4px',
                        backgroundColor: '#ffffff',
                        outline: 'none',
                        color: '#334155',
                      }}
                    />
                    {annSearch && (
                      <button
                        type="button"
                        onClick={() => setAnnSearch('')}
                        style={{
                          position: 'absolute',
                          right: '6px',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: '#94a3b8',
                          padding: 0,
                          display: 'flex',
                        }}
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Announcement List */}
              <div style={{ flex: 1, padding: '12px 20px', maxHeight: '420px', overflowY: 'auto' }}>
                {displayedAnnouncements.length === 0 ? (
                  <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8' }}>
                    <Megaphone size={30} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                    <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#64748b' }}>
                      {annSearch ? 'No matching announcements' : 'No announcements published yet'}
                    </div>
                  </div>
                ) : (
                  displayedAnnouncements.map((ann) => (
                    <AccordionItem
                      key={ann.id || ann._id}
                      title={ann.title}
                      badge={
                        ann.scope === 'department'
                          ? `Dept: ${ann.target_ids?.[0] || ''}`
                          : ann.scope === 'group'
                          ? `Groups: ${ann.target_ids?.length || 1}`
                          : 'Broadcast'
                      }
                      date={formatDate(ann.date || ann.created_at)}
                      actions={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenEditAnnouncement(ann);
                            }}
                            className="btn btn-ghost btn-sm"
                            title="Edit Announcement"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setAnnToDelete(ann);
                            }}
                            className="btn btn-danger-outline btn-sm"
                            title="Delete Announcement"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      }
                    >
                      <div
                        style={{
                          fontSize: '13px',
                          color: '#475569',
                          lineHeight: 1.6,
                          whiteSpace: 'pre-wrap',
                          padding: '4px 0',
                        }}
                      >
                        {ann.content}
                      </div>
                    </AccordionItem>
                  ))
                )}
              </div>
            </div>
          );
        })()}

        {/* Right: Attachments & Guidelines */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderTop: '3px solid #16a34a',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={18} color="#16a34a" />
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                Attachments & Rubrics
              </h2>
            </div>
            <button
              type="button"
              onClick={() => {
                setAttFormData({ title: '', file: null });
                setIsAttModalOpen(true);
              }}
              className="btn btn-success btn-sm"
            >
              <Upload size={14} />
              <span>Upload</span>
            </button>
          </div>

          {/* List */}
          <div style={{ flex: 1, padding: '14px 20px', maxHeight: '420px', overflowY: 'auto' }}>
            {(!data?.attachments || data.attachments.length === 0) ? (
              <div style={{ padding: '30px 10px', textAlign: 'center', color: '#94a3b8' }}>
                <FileText size={30} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                <div style={{ fontSize: '13.5px', fontWeight: 500, color: '#64748b' }}>
                  No guidelines or templates attached
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
                    marginBottom: '8px',
                    backgroundColor: '#f8fafc',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                    <FileText size={20} color="#0073aa" style={{ flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', truncate: true }}>
                        {att.title || att.filename}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        {formatFileSize(att.size)} • {formatDate(att.created_at)}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <a
                      href={att.download_url || `/api/attachments/${att.id || att._id}/download`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        border: 'none',
                        background: 'none',
                        color: '#0073aa',
                        padding: '6px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                      }}
                      title="Download file"
                    >
                      <Download size={16} />
                    </a>
                    <button
                      type="button"
                      onClick={() => handleOpenEditAttachment(att)}
                      className="btn btn-ghost btn-sm"
                      title="Rename Attachment"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAttToDelete(att)}
                      className="btn btn-danger-outline btn-sm"
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

      {/* Modal: New / Edit Announcement with Target Selector */}
      <Modal
        isOpen={isAnnModalOpen}
        onClose={() => setIsAnnModalOpen(false)}
        title={annFormData.id ? 'Edit Announcement' : 'Create New Announcement'}
      >
        <form onSubmit={handleSaveAnnouncement}>
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Announcement Title *
            </label>
            <input
              type="text"
              value={annFormData.title}
              onChange={(e) => setAnnFormData({ ...annFormData, title: e.target.value })}
              placeholder="e.g. FYP Proposal Guidelines Released"
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

          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Target Audience / Scope *
            </label>
            <select
              value={annFormData.scope}
              onChange={(e) => setAnnFormData({ ...annFormData, scope: e.target.value })}
              style={{
                width: '100%',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                padding: '8px 12px',
                fontSize: '13.5px',
                backgroundColor: '#ffffff',
                outline: 'none',
              }}
            >
              <option value="broadcast">Broadcast (All Students & Faculty)</option>
              <option value="department">Specific Department</option>
              <option value="group">Specific Group(s)</option>
            </select>
          </div>

          {annFormData.scope === 'department' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Select Department *
              </label>
              <select
                value={annFormData.target_dept}
                onChange={(e) => setAnnFormData({ ...annFormData, target_dept: e.target.value })}
                required
                style={{
                  width: '100%',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  padding: '8px 12px',
                  fontSize: '13.5px',
                  backgroundColor: '#ffffff',
                  outline: 'none',
                }}
              >
                <option value="">-- Choose Department --</option>
                {departments.map((d) => (
                  <option key={d.id || d._id || d.code} value={d.code}>
                    {d.code} - {d.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {annFormData.scope === 'group' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
                Target Group IDs (Comma-separated) *
              </label>
              <input
                type="text"
                value={annFormData.target_groups}
                onChange={(e) => setAnnFormData({ ...annFormData, target_groups: e.target.value })}
                placeholder="e.g. 64f1..., 64f2..."
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
          )}

          <div style={{ marginBottom: '18px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}>
              Content / Message *
            </label>
            <textarea
              rows={4}
              value={annFormData.content}
              onChange={(e) => setAnnFormData({ ...annFormData, content: e.target.value })}
              placeholder="Enter announcement description..."
              required
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
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={annLoading}
              className="btn btn-primary"
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
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteAnnouncement}
            disabled={annLoading}
            className="btn btn-danger"
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
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
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#334155', marginBottom: '5px' }}>
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
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={attLoading}
              className="btn btn-primary"
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
            className="btn btn-secondary"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirmDeleteAttachment}
            disabled={attLoading}
            className="btn btn-danger"
          >
            {attLoading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Modal: Edit Attachment Title */}
      <Modal
        isOpen={!!attToEdit}
        onClose={() => setAttToEdit(null)}
        title="Edit Attachment Title"
        maxWidth="450px"
      >
        <form onSubmit={handleSaveEditAttachment}>
          {attEditError && (
            <div
              style={{
                padding: '10px 12px',
                backgroundColor: '#fee2e2',
                border: '1px solid #fecaca',
                borderRadius: '4px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '14px',
              }}
            >
              {attEditError}
            </div>
          )}

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
              Attachment Title *
            </label>
            <input
              type="text"
              value={attEditTitle}
              onChange={(e) => setAttEditTitle(e.target.value)}
              placeholder="e.g. Project Proposal Guidelines"
              required
              maxLength={200}
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: '13.5px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
              Original filename: <strong>{attToEdit?.filename}</strong>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAttToEdit(null)}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={attEditLoading}
              className="btn btn-primary"
            >
              {attEditLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
