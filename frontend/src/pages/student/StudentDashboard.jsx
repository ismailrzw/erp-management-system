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
  Clock,
  BookOpen,
} from 'lucide-react';
import { studentDashboardApi } from '../../api/studentDashboardApi';
import { studentAttachmentsApi } from '../../api/studentAttachmentsApi';
import { StatCard } from '../../components/ui/StatCard';
import { AccordionItem } from '../../components/ui/Accordion';
import { Toast } from '../../components/ui/Toast';
import { Preloader } from '../../components/ui/Preloader';
import { formatDate } from '../../utils/dateUtils';
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

  if (loading) {
    return <Preloader text="Loading Student Dashboard..." />;
  }

  const student = data?.student || {};
  const group = data?.group;
  const pendingInvitesCount = data?.pending_invitations_count || 0;
  const announcements = data?.announcements || [];
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
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '14px',
          marginBottom: '22px',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--heading)',
              letterSpacing: '-0.2px',
            }}
          >
            Welcome back, {student.name || 'Student'}!
          </h1>
          <div
            style={{
              fontSize: '13px',
              color: 'var(--muted)',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
            }}
          >
            <span>Roll: <b>{student.roll}</b></span>
            <span>•</span>
            <span>{student.dept} - Section {student.section}</span>
            <span>•</span>
            <span>Course: <b>{student.course}</b></span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
          >
            <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="stat-grid-responsive" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard
          title="Project Group"
          value={group ? group.name : 'No Group'}
          icon={Users}
          color={group ? 'primary' : 'warning'}
          subtext={group ? `Status: ${group.status?.toUpperCase()}` : 'Not in a group'}
          onClick={() => navigate(group ? '/student/group/my' : '/student/group/browse')}
        />
        <StatCard
          title="Group Members"
          value={group ? `${group.member_count || group.members?.length || 1} / ${group.max_group || 5}` : '0'}
          icon={FolderGit2}
          color={group ? 'success' : 'muted'}
          subtext={group?.is_leader ? '👑 You are Group Leader' : (group ? 'Team Member' : 'Join a group to collaborate')}
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
          color="primary"
          subtext="Posted by PBL Manager"
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
            {group && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  backgroundColor: group.status === 'approved' ? '#dcfce7' : '#fef9c3',
                  color: group.status === 'approved' ? '#15803d' : '#a16207',
                  textTransform: 'uppercase',
                }}
              >
                {group.status}
              </span>
            )}
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
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
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
                  <div>Department: <b>{group.dept}</b></div>
                  <div>•</div>
                  <div>Section: <b>{group.section}</b></div>
                  <div>•</div>
                  <div>Course: <b>{group.course}</b></div>
                </div>
              </div>

              {/* Members Preview */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--heading)', marginBottom: '8px' }}>
                  Members ({group.members?.length || group.member_count || 1} / {group.max_group || 5})
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
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                          }}
                        >
                          {m.name?.[0]?.toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                            {m.name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {m.roll}
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
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                textAlign: 'center',
                padding: '28px 16px',
                gap: '12px',
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  backgroundColor: '#fef9c3',
                  color: '#ca8a04',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '4px',
                }}
              >
                <Users size={28} />
              </div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
                You are not in a group yet
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: '13px',
                  color: 'var(--body-text)',
                  maxWidth: '360px',
                  lineHeight: '1.5',
                }}
              >
                Form a new group as leader with your course peers, or browse existing groups in your section and send join requests.
              </p>

              <div
                style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  justifyContent: 'center',
                  marginTop: '12px',
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
                    flex: '1 1 160px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary-hover)')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--primary)')}
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
                    flex: '1 1 160px',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <Compass size={16} />
                  <span>Browse & Invites {pendingInvitesCount > 0 && `(${pendingInvitesCount})`}</span>
                </button>
              </div>
            </div>
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
            }}
          >
            <div style={{ display: 'flex', gap: '8px' }}>
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
          </div>

          {/* Tab 1: Announcements Accordion */}
          {activeTab === 'announcements' && (
            <div>
              {announcements.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--muted)', fontSize: '13px' }}>
                  No announcements published yet.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {announcements.map((ann, idx) => (
                    <AccordionItem
                      key={ann.id || ann._id || idx}
                      title={ann.title}
                      badge={formatDate(ann.date || ann.created_at)}
                      defaultOpen={idx === 0}
                    >
                      <div style={{ fontSize: '13.5px', lineHeight: '1.6', color: '#334155', whiteSpace: 'pre-wrap' }}>
                        {ann.content}
                      </div>
                    </AccordionItem>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tab 2: Attachments List */}
          {activeTab === 'attachments' && (
            <div>
              {attachments.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 16px', color: 'var(--muted)', fontSize: '13px' }}>
                  No shared attachments available.
                </div>
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
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
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
