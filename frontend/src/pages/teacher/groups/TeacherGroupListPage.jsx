import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FolderGit2, Search, ArrowRight, RefreshCw, Users, FileText, Download } from 'lucide-react';
import { teacherPortalApi } from '../../../api/teacherPortalApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';

export const TeacherGroupListPage = () => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const navigate = useNavigate();

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const params = {};
      if (search.trim()) params.search = search.trim();
      const res = await teacherPortalApi.getGroups(params);
      if (res.success && res.data) {
        setGroups(res.data.items || res.data || []);
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to load supervised groups',
        type: 'error',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search]);

  useEffect(() => {
    fetchGroups();
  }, [fetchGroups]);

  if (loading && !refreshing) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="My Supervised Groups"
          subtitle="All active FYP project teams under your supervision."
          breadcrumbs={[
            { label: 'Home', to: '/teacher/dashboard' },
            { label: 'My Groups' },
          ]}
        />
        <ContentLoader label="Loading groups..." />
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
        title="My Supervised Groups"
        subtitle="All active FYP project teams under your supervision."
        breadcrumbs={[
          { label: 'Home', to: '/teacher/dashboard' },
          { label: 'My Groups' },
        ]}
      >
        <button
          type="button"
          onClick={() => fetchGroups(true)}
          disabled={refreshing}
          className="btn btn-ghost btn-sm"
        >
          <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
          <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
        </button>
      </PageHeader>

      {/* Search Bar */}
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
        }}
      >
        <div style={{ position: 'relative', flex: '1 1 280px' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search group name, project title, leader..."
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
      </div>

      {/* Groups Grid / Cards */}
      {groups.length === 0 ? (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '40px 20px',
            textAlign: 'center',
            color: '#94a3b8',
          }}
        >
          <FolderGit2 size={44} style={{ margin: '0 auto 12px', opacity: 0.5 }} />
          <div style={{ fontWeight: 600, color: '#475569', fontSize: '15px' }}>
            No supervised groups found
          </div>
          <div style={{ fontSize: '13px', marginTop: '4px' }}>
            You will see project teams here once you accept supervisor requests on your dashboard.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '18px' }}>
          {groups.map((g) => (
            <div
              key={g.id}
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                    {g.name}
                  </h3>
                  <StatusBadge status={g.status} />
                </div>

                <div style={{ fontSize: '13.5px', color: '#0073aa', fontWeight: 600, marginBottom: '12px' }}>
                  {g.project_title || 'Untitled Project'}
                </div>

                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    borderRadius: '6px',
                    padding: '10px 12px',
                    fontSize: '12.5px',
                    color: '#334155',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    marginBottom: '16px',
                  }}
                >
                  <div>Course: <b>{g.course || 'FYP'}</b> (Sec {g.section || 'A'})</div>
                  <div>Team Lead: <b>{g.leader_name}</b> ({g.leader_roll})</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Users size={12} />
                    <span>Members: <b>{g.member_count || 1} Students</b></span>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                {g.proposal_download_url ? (
                  <a
                    href={g.proposal_download_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: '12px',
                      color: '#0073aa',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      textDecoration: 'none',
                      fontWeight: 500,
                    }}
                  >
                    <Download size={13} />
                    <span>Proposal</span>
                  </a>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>No proposal attached</span>
                )}

                <button
                  type="button"
                  onClick={() => navigate(`/teacher/groups/${g.id}`)}
                  className="btn btn-primary btn-sm"
                >
                  <span>Manage Group</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
