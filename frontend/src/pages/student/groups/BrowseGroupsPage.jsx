import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Users,
  CheckCircle2,
  XCircle,
  PlusCircle,
  FolderGit2,
  RefreshCw,
  Loader2,
  AlertCircle,
  BookOpen,
  Calendar,
  Layers,
  Search,
  Compass,
  Crown,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { studentDashboardApi } from '../../../api/studentDashboardApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';
import { formatDate } from '../../../utils/dateUtils';

export const BrowseGroupsPage = () => {
  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'invitations'
  const [groups, setGroups] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [studentInfo, setStudentInfo] = useState(null);
  const [existingGroup, setExistingGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Filters for browse
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchingGroups, setSearchingGroups] = useState(false);

  const navigate = useNavigate();

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const [dashRes, invitesRes, groupsRes] = await Promise.all([
        studentDashboardApi.getDashboard(),
        studentGroupApi.getPendingInvitations(),
        studentGroupApi.browseGroups({ search: searchQuery, status: statusFilter }),
      ]);

      if (dashRes.success && dashRes.data) {
        setStudentInfo(dashRes.data.student);
        setExistingGroup(dashRes.data.group);
      }
      if (invitesRes.success && invitesRes.data) {
        setInvitations(invitesRes.data.items || invitesRes.data || []);
      }
      if (groupsRes.success && groupsRes.data) {
        const rawGroups = groupsRes.data.items || [];
        rawGroups.sort((a, b) => (b.is_my_group ? 1 : 0) - (a.is_my_group ? 1 : 0));
        setGroups(rawGroups);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load group data',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [searchQuery, statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search for groups
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        setSearchingGroups(true);
        const res = await studentGroupApi.browseGroups({ search: searchQuery, status: statusFilter });
        if (res.success && res.data) {
          const rawGroups = res.data.items || [];
          rawGroups.sort((a, b) => (b.is_my_group ? 1 : 0) - (a.is_my_group ? 1 : 0));
          setGroups(rawGroups);
        }
      } catch {
        // silent fail on type
      } finally {
        setSearchingGroups(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter]);

  const handleAcceptInvite = async (invitationId) => {
    if (existingGroup) {
      setToast({
        message: 'You must leave your current group before accepting a new invitation.',
        type: 'error',
      });
      return;
    }

    try {
      setProcessingId(invitationId);
      const res = await studentGroupApi.acceptInvitation(invitationId);
      if (res.success) {
        setToast({ message: 'Invitation accepted! Welcome to the group.', type: 'success' });
        setTimeout(() => {
          navigate('/student/group/my');
        }, 700);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to accept invitation',
        type: 'error',
      });
      setProcessingId(null);
    }
  };

  const handleDeclineInvite = async (invitationId) => {
    try {
      setProcessingId(invitationId);
      const res = await studentGroupApi.declineInvitation(invitationId);
      if (res.success) {
        setToast({ message: 'Invitation declined.', type: 'info' });
        loadData();
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to decline invitation',
        type: 'error',
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return <Preloader text="Loading Groups & Invitations..." />;
  }

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Page Header */}
      <PageHeader
        title="Group Discovery & Invitations"
        subtitle={`Course: ${studentInfo?.course || 'Not Assigned'} • Department: ${studentInfo?.dept || 'N/A'} (Section ${studentInfo?.section || 'N/A'})`}
      >
        <button
          type="button"
          onClick={() => loadData(true)}
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
          }}
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>

        {!existingGroup && (
          <button
            type="button"
            onClick={() => navigate('/student/group/create')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            <PlusCircle size={15} />
            <span>Create Group</span>
          </button>
        )}
      </PageHeader>

      {/* Existing Group Membership Notice */}
      {existingGroup && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '12px 16px',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#1e40af',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <div>
              You are currently enrolled in <b>{existingGroup.name}</b>. Students may belong to only one project group at a time.
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate('/student/group/my')}
            style={{
              padding: '5px 12px',
              fontSize: '12px',
              fontWeight: 600,
              backgroundColor: '#ffffff',
              color: '#1e40af',
              border: '1px solid #93c5fd',
              borderRadius: '5px',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            View My Group
          </button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          borderBottom: '2px solid #e2e8f0',
          marginBottom: '20px',
          flexWrap: 'wrap',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('browse')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'browse' ? 700 : 500,
            color: activeTab === 'browse' ? 'var(--primary)' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'browse' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <Compass size={16} />
          <span>Browse Course Groups ({groups.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('invitations')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: activeTab === 'invitations' ? 700 : 500,
            color: activeTab === 'invitations' ? 'var(--primary)' : '#64748b',
            border: 'none',
            borderBottom: activeTab === 'invitations' ? '3px solid var(--primary)' : '3px solid transparent',
            backgroundColor: 'transparent',
            marginBottom: '-2px',
            cursor: 'pointer',
          }}
        >
          <Mail size={16} />
          <span>Pending Invitations</span>
          {invitations.length > 0 && (
            <span
              style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 7px',
                borderRadius: '10px',
              }}
            >
              {invitations.length}
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: BROWSE GROUPS */}
      {activeTab === 'browse' && (
        <div>
          {/* Search & Filter Bar */}
          <div
            className="toolbar-responsive"
            style={{
              backgroundColor: '#ffffff',
              padding: '12px 16px',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
              marginBottom: '18px',
            }}
          >
            <div className="toolbar-group-left">
              <div style={{ position: 'relative', width: '100%', maxWidth: '380px' }}>
                <Search
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by group name or project title..."
                  style={{
                    width: '100%',
                    padding: '8px 12px 8px 36px',
                    fontSize: '13px',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    outline: 'none',
                  }}
                />
                {searchingGroups && (
                  <Loader2
                    size={14}
                    className="animate-spin"
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)' }}
                  />
                )}
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  backgroundColor: '#ffffff',
                  color: '#334155',
                  outline: 'none',
                  cursor: 'pointer',
                }}
              >
                <option value="all">All Statuses</option>
                <option value="pending">Pending Approval</option>
                <option value="approved">Approved</option>
                <option value="rejected">Needs Revision</option>
              </select>
            </div>
          </div>

          {/* Groups Grid */}
          {groups.length === 0 ? (
            <div className="card-responsive">
              <EmptyState
                icon={FolderGit2}
                title="No project groups found"
                description={
                  searchQuery
                    ? `No groups match "${searchQuery}". Try a different search term.`
                    : `No active groups formed in ${studentInfo?.course || 'this course'} yet.`
                }
              />
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {groups.map((g) => (
                <div
                  key={g.id}
                  className="card-responsive"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '14px',
                    backgroundColor: g.is_my_group ? '#f0f9ff' : '#ffffff',
                    border: g.is_my_group ? '2px solid #38bdf8' : '1px solid #e2e8f0',
                    borderTop: g.is_my_group ? '4px solid #0284c7' : '3px solid #cbd5e1',
                    boxShadow: g.is_my_group ? '0 4px 14px rgba(2, 132, 199, 0.12)' : '0 1px 3px rgba(0, 0, 0, 0.05)',
                    position: 'relative',
                  }}
                >
                  <div>
                    {g.is_my_group && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          backgroundColor: '#0284c7',
                          color: '#ffffff',
                          fontSize: '11px',
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: '12px',
                          marginBottom: '10px',
                          letterSpacing: '0.3px',
                        }}
                      >
                        <Crown size={12} />
                        <span>YOUR ENROLLED GROUP</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                      <div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                          {g.name}
                        </div>
                        <div style={{ fontSize: '13.5px', color: '#475569', marginTop: '3px', fontWeight: 500, wordBreak: 'break-word' }}>
                          {g.project_title || 'Untitled Project'}
                        </div>
                      </div>
                      <StatusBadge status={g.status} size="small" />
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        marginTop: '12px',
                        padding: '10px 12px',
                        backgroundColor: g.is_my_group ? '#e0f2fe' : '#f8fafc',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: g.is_my_group ? '#0369a1' : '#64748b',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={13} />
                        <span>
                          Leader: <b>{g.leader_name || 'Group Leader'}</b> {g.leader_roll ? `(${g.leader_roll})` : ''}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <BookOpen size={13} />
                        <span>
                          {g.course} • Section {g.section || 'N/A'} • {g.dept}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Layers size={13} />
                        <span>
                          Members: <b>{g.member_count || 1} / {g.max_group || 4}</b>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                      Created: {formatDate(g.created_at)}
                    </div>
                    {g.is_my_group && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#0369a1',
                          backgroundColor: '#bae6fd',
                          padding: '2px 8px',
                          borderRadius: '10px',
                        }}
                      >
                        Your Group
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PENDING INVITATIONS */}
      {activeTab === 'invitations' && (
        <div className="card-responsive" style={{ borderTop: '3px solid var(--primary)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingBottom: '14px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '18px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Mail size={18} color="var(--primary)" />
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
                Invitations Received ({invitations.length})
              </h2>
            </div>
          </div>

          {invitations.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No Pending Invitations"
              description="When team leaders in your course invite you to join their project group, your invitations will appear here."
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {invitations.map((inv) => {
                const isProcessing = processingId === inv.id;
                const inviterName = inv.invited_by_name || inv.leader_name || 'Group Leader';
                const inviterRoll = inv.invited_by_roll || inv.leader_roll;
                const hasGroupBlocked = !!existingGroup;

                return (
                  <div
                    key={inv.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px',
                      padding: '16px 18px',
                      backgroundColor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: '1 1 280px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '8px',
                            backgroundColor: '#e0f2fe',
                            color: '#0369a1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px',
                          }}
                        >
                          <FolderGit2 size={22} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a', wordBreak: 'break-word' }}>
                              {inv.group_name || 'Project Group'}
                            </span>
                            <StatusBadge status="pending" size="small" />
                          </div>

                          <div style={{ fontSize: '13.5px', color: '#1e293b', marginTop: '4px', fontWeight: 500, wordBreak: 'break-word' }}>
                            Project: <span style={{ fontWeight: 600, color: 'var(--primary)' }}>{inv.project_title || 'Untitled Project'}</span>
                          </div>

                          {/* Metadata Pills */}
                          <div
                            style={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              alignItems: 'center',
                              gap: '10px',
                              marginTop: '8px',
                              fontSize: '12px',
                              color: '#64748b',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <BookOpen size={13} />
                              <span>{inv.group_course || studentInfo?.course || 'Course'} (Sec {inv.group_section || studentInfo?.section})</span>
                            </div>

                            <div>•</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Users size={13} />
                              <span>Invited by: <b>{inviterName}</b> {inviterRoll ? `(${inviterRoll})` : ''}</span>
                            </div>

                            <div>•</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Layers size={13} />
                              <span>{inv.member_count ? `${inv.member_count} Members` : 'Team forming'}</span>
                            </div>

                            <div>•</div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Calendar size={13} />
                              <span>{formatDate(inv.created_at)}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handleAcceptInvite(inv.id)}
                          disabled={isProcessing || hasGroupBlocked}
                          title={hasGroupBlocked ? 'You must leave your current group before accepting.' : 'Accept and join group'}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: hasGroupBlocked ? '#94a3b8' : 'var(--success)',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: hasGroupBlocked || isProcessing ? 'not-allowed' : 'pointer',
                            opacity: hasGroupBlocked ? 0.7 : 1,
                          }}
                        >
                          {isProcessing ? (
                            <Loader2 size={15} className="animate-spin" />
                          ) : (
                            <CheckCircle2 size={15} />
                          )}
                          <span>{hasGroupBlocked ? 'In Another Group' : 'Accept'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDeclineInvite(inv.id)}
                          disabled={isProcessing}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            backgroundColor: '#ffffff',
                            color: '#dc2626',
                            border: '1px solid #fecaca',
                            borderRadius: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: isProcessing ? 'not-allowed' : 'pointer',
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                        >
                          <XCircle size={15} />
                          <span>Decline</span>
                        </button>
                      </div>
                    </div>

                    {hasGroupBlocked && (
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          color: '#b45309',
                          backgroundColor: '#fffbeb',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          border: '1px solid #fde68a',
                        }}
                      >
                        <AlertCircle size={13} style={{ flexShrink: 0 }} />
                        <span>You cannot accept this invitation while you are a member of <b>{existingGroup.name}</b>.</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
