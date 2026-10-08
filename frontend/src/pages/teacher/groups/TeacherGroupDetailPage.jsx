import { TaskReview } from '../../../components/groups/TaskReview';
import { ProposalSummary } from '../../../components/groups/ProposalSummary';
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  FolderGit2,
  Users,
  Calendar,
} from 'lucide-react';
import { teacherPortalApi } from '../../../api/teacherPortalApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { StatusBadge } from '../../../components/ui/StatusBadge';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { formatDate } from '../../../utils/dateUtils';
import { ProjectActivityTimeline } from '../../../components/groups/ProjectActivityTimeline';

export const TeacherGroupDetailPage = () => {
  const { groupId } = useParams();
  const [error, setError] = useState('');
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const navigate = useNavigate();

  const fetchDetail = useCallback(async () => {
    try {
      const res = await teacherPortalApi.getGroupDetail(groupId); setError('');
      if (res.success && res.data) {
        setGroup(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Group could not be loaded.');
      setToast({
        message: err.response?.data?.message || 'Failed to load group details',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  if (loading) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Project Group Details"
          subtitle="Supervisory overview of team members and deliverables."
          breadcrumbs={[
            { label: 'Home', to: '/teacher/dashboard' },
            { label: 'My Groups', to: '/teacher/groups' },
            { label: 'Group Details' },
          ]}
        />
        <ContentLoader label="Loading group details..." />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="page-frame-container">
        <div style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '30px', textAlign: 'center' }}>
          <FolderGit2 size={40} style={{ margin: '0 auto 10px', color: '#94a3b8' }} />
          <h3>Group workspace unavailable</h3><p role="alert">{error || 'Group not found or access denied.'}</p><button className="btn btn-secondary" onClick={fetchDetail}>Retry</button>
          <button type="button" onClick={() => navigate('/teacher/groups')} className="btn btn-back" style={{ marginTop: '12px' }}>
            <ArrowLeft size={18} />Back to My Groups
          </button>
        </div>
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
        title={group.name}
        subtitle={group.project_title || 'FYP Project Group'}
        breadcrumbs={[
          { label: 'Home', to: '/teacher/dashboard' },
          { label: 'My Groups', to: '/teacher/groups' },
          { label: group.name },
        ]}
      >
        <button
          type="button"
          onClick={() => navigate('/teacher/groups')}
          className="btn btn-back"
        >
          <ArrowLeft size={16} />
          <span>Back to Groups</span>
        </button>
      </PageHeader>

      {/* Group Info Header Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          marginBottom: '22px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px', marginBottom: '18px' }}>
          <div>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, marginBottom: '2px' }}>
              PROJECT TITLE
            </div>
            <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              {group.project_title || 'Untitled Project'}
            </h2>
          </div>
          <StatusBadge status={group.status} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', textTransform: 'uppercase' }}>Course</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{group.course || 'Needs correction'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', textTransform: 'uppercase' }}>Department</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{group.dept || 'Needs correction'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', textTransform: 'uppercase' }}>Formation Status</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{group.formation_status || 'On Time'}</div>
          </div>
          <div>
            <div style={{ fontSize: '11.5px', color: '#64748b', textTransform: 'uppercase' }}>Created On</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', marginTop: '2px' }}>{formatDate(group.created_at)}</div>
          </div>
        </div>

        {/* Proposal Document Link if attached */}

      </div>

      {/* Team Members List Card */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          padding: '24px',
          marginBottom: '22px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Users size={18} color="#0073aa" />
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
            Team Members ({group.members?.length || 0})
          </h3>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
          {group.members?.map((m) => (
            <div
              key={m.id}
              style={{
                border: m.is_leader ? '2px solid #0073aa' : '1px solid #e2e8f0',
                backgroundColor: m.is_leader ? '#f0f9ff' : '#ffffff',
                borderRadius: '8px',
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontWeight: 700, fontSize: '14.5px', color: '#0f172a' }}>
                  {m.name}
                </span>
                {m.is_leader && (
                  <span
                    style={{
                      backgroundColor: '#0073aa',
                      color: '#ffffff',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    Group Leader
                  </span>
                )}
              </div>

              <div style={{ fontSize: '12.5px', color: '#475569', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <div>Roll No: <b>{m.roll}</b></div>
                <div>Email: {m.email}</div>
                <div>Section: Sec {m.section}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ProposalSummary proposal={group.proposal} />
      <section className="workflow-card"><h3>Milestone Submissions and Grading</h3>{(group.timeline || []).flatMap((s) => s.milestones).map((m) => <details key={m.milestone_id}><summary>{m.title}</summary><TaskReview groupId={group.id} taskId={m.milestone_id} /></details>)}</section>
      {/* Project Milestones & Activity Timeline */}
      <ProjectActivityTimeline timeline={group.timeline || []} />

      {/* Supervision / Meeting Records */}
      {group.meetings && group.meetings.length > 0 && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
            <Calendar size={18} color="#0073aa" />
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1e293b' }}>
              Supervision Meeting Records ({group.meetings.length})
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {group.meetings.map((mtg, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px 16px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '6px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b' }}>
                    Meeting on {formatDate(mtg.date)}
                  </span>
                </div>
                {mtg.summary && (
                  <div style={{ fontSize: '12.5px', color: '#475569' }}>
                    <b>Summary:</b> {mtg.summary}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
