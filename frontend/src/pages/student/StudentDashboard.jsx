import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  FolderGit2,
  Mail,
  Megaphone,
  PlusCircle,
  Compass,
  ArrowRight,
  Download,
  FileText,
  Crown,
  RefreshCw,
  AlertCircle,
  Edit,
} from 'lucide-react';
import { studentDashboardApi } from '../../api/studentDashboardApi';
import { studentAttachmentsApi } from '../../api/studentAttachmentsApi';
import { studentAnnouncementsApi } from '../../api/studentAnnouncementsApi';
import { StatCard } from '../../components/ui/StatCard';
import { AccordionItem } from '../../components/ui/Accordion';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Toast } from '../../components/ui/Toast';
import { Preloader } from '../../components/ui/Preloader';
import { formatFileSize } from '../../utils/fileUtils';

export const StudentDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('announcements'); // 'announcements' | 'attachments'
  const navigate = useNavigate();

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await studentDashboardApi.getDashboard();
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
    fetchDashboard();
  }, [fetchDashboard]);

  const handleDownloadAttachment = async (att) => {
    try {
      await studentAttachmentsApi.download(att.id || att._id, att.original_filename || att.title);
      setToast({ message: 'Download started...', type: 'success' });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to download attachment',
        type: 'error',
      });
    }
  };

  const handleMarkViewed = async (annId) => {
    if (!annId) return;
    setData((prev) => {
      if (!prev || !prev.announcements) return prev;
      const updatedAnnouncements = prev.announcements.map((a) => {
        if ((a.id === annId || a._id === annId) && a.is_recent) {
          return { ...a, is_recent: false };
        }
        return a;
      });
      const newRecentCount = updatedAnnouncements.filter((a) => a.is_recent).length;
      return {
        ...prev,
        announcements: updatedAnnouncements,
        recent_announcements_count: newRecentCount,
      };
    });

    try {
      await studentAnnouncementsApi.markAsViewed(annId);
    } catch {
      // background sync
    }
  };

  const handleMarkAllViewed = async () => {
    setData((prev) => {
      if (!prev || !prev.announcements) return prev;
      const updatedAnnouncements = prev.announcements.map((a) => ({ ...a, is_recent: false }));
      return {
        ...prev,
        announcements: updatedAnnouncements,
        recent_announcements_count: 0,
      };
    });

    try {
      await studentAnnouncementsApi.markAllAsViewed();
      setToast({ message: 'All announcements marked as read.', type: 'info' });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to mark all as read',
        type: 'error',
      });
    }
  };

  if (loading) {
    return <Preloader text="Loading Student Dashboard..." />;
  }

  const student = data?.student || {};
  const group = data?.group;
  const pendingInvitesCount = data?.pending_invitations_count || 0;
  const announcements = data?.announcements || [];
  const recentAnnouncementsCount = data?.recent_announcements_count ?? announcements.filter((a) => a.is_recent).length;
  const attachments = data?.attachments || [];

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
      {/* Toast Feedback */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title={`Welcome back, ${student.name || 'Student'}!`}
        subtitle={`Roll: ${student.roll || 'N/A'} • ${student.dept || 'Department'} (Section ${student.section || 'N/A'}) • Course: ${student.course || 'N/A'}`}
      >
        <button
          type="button"
          onClick={() => fetchDashboard(true)}
          disabled={refreshing}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '8px 14px',
            fontSize: '13px',
            fontWeight: 500,
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
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
      </PageHeader>

      {/* Rejection Alert Banner if group was rejected */}
      {group && group.status === 'rejected' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '14px',
            padding: '14px 18px',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: '1 1 300px' }}>
            <AlertCircle size={20} color="#dc2626" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: '#991b1b' }}>
                Group Proposal Requires Revisions
              </div>
              <div style={{ fontSize: '13px', color: '#b91c1c', marginTop: '4px', lineHeight: 1.5 }}>
                <b>Manager Feedback:</b> {group.rejection_reason || 'Please review your project proposal and resubmit.'}
              </div>
              <div style={{ fontSize: '12px', color: '#7f1d1d', marginTop: '4px' }}>
                Group leaders can revise group name and project title on the group page to automatically resubmit for manager approval.
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => navigate('/student/group/my')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 14px',
              fontSize: '12.5px',
              fontWeight: 600,
              backgroundColor: '#dc2626',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <Edit size={14} />
            <span>Update Proposal</span>
          </button>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="stat-grid-4">
        <StatCard
          title="Project Group"
          value={group ? group.name : 'No Group'}
          icon={Users}
          color={group ? (group.status === 'approved' ? 'success' : group.status === 'rejected' ? 'danger' : 'primary') : 'warning'}
          subtext={group ? `Status: ${(group.status || '').toUpperCase()}` : 'Not in a group'}
          onClick={() => navigate(group ? '/student/group/my' : '/student/group/browse')}
        />
        <StatCard
          title="Group Members"
          value={group ? `${group.member_count || group.members?.length || 1} / ${group.max_group || 4}` : '0'}
          icon={FolderGit2}
          color={group ? 'success' : 'muted'}
          subtext={group?.is_leader ? 'Group Leader' : group ? 'Team Member' : 'Join a group to collaborate'}
          onClick={() => group && navigate('/student/group/my')}
        />
        <StatCard
          title="Pending Invitations"
          value={pendingInvitesCount}
          icon={Mail}
          color={pendingInvitesCount > 0 ? 'danger' : 'info'}
          subtext={pendingInvitesCount > 0 ? 'Invitations require response' : 'No pending requests'}
          onClick={() => navigate('/student/group/browse')}
        />
        <StatCard
          title="Announcements"
          value={announcements.length}
          icon={Megaphone}
          color={recentAnnouncementsCount > 0 ? 'warning' : 'primary'}
          subtext={recentAnnouncementsCount > 0 ? `${recentAnnouncementsCount} recent unread` : 'Posted by PBL Manager'}
        />
      </div>

      {/* Dual Panel Layout */}
      <div className="dashboard-dual-grid" style={{ marginTop: '8px' }}>
        {/* Left Card: Group Overview */}
        <div
          className="card-responsive"
          style={{
            borderTop: '3px solid var(--primary)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FolderGit2 size={18} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
                My Project Group
              </h2>
            </div>
            {group && <StatusBadge status={group.status} />}
          </div>

          {group ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                }}
              >
                <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                  Project Title
                </div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '2px', wordBreak: 'break-word' }}>
                  {group.project_title || 'Untitled Project'}
                </div>
                <div style={{ fontSize: '13px', color: '#475569', marginTop: '6px' }}>
                  Group Name: <b>{group.name}</b>
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '12px',
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#64748b',
                  }}
                >
                  <div>Course: <b>{group.course}</b></div>
                  <div>•</div>
                  <div>Department: <b>{group.dept}</b></div>
                  <div>•</div>
                  <div>Section: <b>{group.section}</b></div>
                </div>
              </div>

              {/* Members Preview */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--heading)', marginBottom: '8px' }}>
                  Members ({group.members?.length || group.member_count || 1} / {group.max_group || 4})
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {group.members?.map((m) => (
                    <div
                      key={m.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        backgroundColor: m.is_leader ? '#eff6ff' : '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        flexWrap: 'wrap',
                        gap: '6px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '50%',
                            backgroundColor: m.is_leader ? 'var(--primary)' : '#e2e8f0',
                            color: m.is_leader ? '#ffffff' : '#334155',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 600,
                            flexShrink: 0,
                          }}
                        >
                          {m.name?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', wordBreak: 'break-word' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {m.roll} {m.section ? `• Sec ${m.section}` : ''}
                          </div>
                        </div>
                      </div>

                      {m.is_leader && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#b45309',
                            backgroundColor: '#fef3c7',
                            padding: '2px 8px',
                            borderRadius: '10px',
                          }}
                        >
                          <Crown size={12} /> Leader
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                type="button"
                onClick={() => navigate('/student/group/my')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '10px 16px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginTop: '6px',
                  transition: 'background-color 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
              >
                <span>Manage Project Group</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <EmptyState
              icon={Users}
              title="You are not in a group yet"
              description="Form a new group as leader with your course peers, or browse existing groups to join."
              action={
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '10px',
                    justifyContent: 'center',
                    width: '100%',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => navigate('/student/group/create')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      backgroundColor: 'var(--primary)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      flex: '1 1 150px',
                    }}
                  >
                    <PlusCircle size={16} />
                    <span>Create Group</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => navigate('/student/group/browse')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '9px 16px',
                      backgroundColor: '#ffffff',
                      color: '#334155',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      flex: '1 1 150px',
                    }}
                  >
                    <Compass size={16} />
                    <span>Browse Groups {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}</span>
                  </button>
                </div>
              }
            />
          )}
        </div>

        {/* Right Card: Announcements & Attachments */}
        <div
          className="card-responsive"
          style={{
            borderTop: '3px solid var(--info)',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
          }}
        >
          {/* Header Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid #f1f5f9',
              paddingBottom: '10px',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => setActiveTab('announcements')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'announcements' ? 'var(--primary-light)' : 'transparent',
                    color: activeTab === 'announcements' ? 'var(--primary)' : '#64748b',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Megaphone size={15} />
                  <span>Announcements ({announcements.length})</span>
                  {recentAnnouncementsCount > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '10.5px',
                        fontWeight: 700,
                        backgroundColor: '#0284c7',
                        color: '#ffffff',
                        padding: '1px 6px',
                        borderRadius: '10px',
                      }}
                    >
                      {recentAnnouncementsCount} new
                    </span>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    fontSize: '13px',
                    fontWeight: 600,
                    backgroundColor: activeTab === 'attachments' ? 'var(--primary-light)' : 'transparent',
                    color: activeTab === 'attachments' ? 'var(--primary)' : '#64748b',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                  }}
                >
                  <Download size={15} />
                  <span>Attachments ({attachments.length})</span>
                </button>
              </div>

              {activeTab === 'announcements' && recentAnnouncementsCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllViewed}
                  style={{
                    fontSize: '12px',
                    fontWeight: 500,
                    color: '#0369a1',
                    backgroundColor: '#f0f9ff',
                    border: '1px solid #bae6fd',
                    borderRadius: '4px',
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0f2fe')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f0f9ff')}
                >
                  Mark all as read
                </button>
              )}
            </div>
          </div>

          {/* Tab 1: Announcements Accordion */}
          {activeTab === 'announcements' && (
            <div>
              {announcements.length === 0 ? (
                <EmptyState
                  icon={Megaphone}
                  title="No announcements yet"
                  description="Announcements and guidelines posted by your PBL Manager will appear here."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {announcements.map((ann, idx) => (
                    <AccordionItem
                      key={ann.id || ann._id || idx}
                      announcement={ann}
                      defaultOpen={false}
                      isRecent={Boolean(ann.is_recent)}
                      onView={() => handleMarkViewed(ann.id || ann._id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Attachments List */}
          {activeTab === 'attachments' && (
            <div>
              {attachments.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No attachments shared yet"
                  description="Project guidelines, rubrics, and templates uploaded by the coordinator will appear here."
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {attachments.map((att) => (
                    <div
                      key={att.id || att._id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        gap: '12px',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: '1 1 200px' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: '#e0f2fe',
                            color: '#0284c7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <FileText size={16} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: '13px',
                              fontWeight: 600,
                              color: '#1e293b',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {att.title}
                          </div>
                          <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '1px' }}>
                            {att.original_filename && <span>{att.original_filename} • </span>}
                            <span>{typeof att.size === 'number' ? formatFileSize(att.size) : (att.size || 'File')}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleDownloadAttachment(att)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 500,
                          backgroundColor: '#ffffff',
                          color: 'var(--primary)',
                          border: '1px solid #cbd5e1',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-light)')}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                      >
                        <Download size={13} />
                        <span>Download</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
