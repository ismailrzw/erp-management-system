import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Download,
  FileText,
  Layers,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { managerGroupsApi } from '../../../api/managerGroupsApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { BackButton } from '../../../components/ui/BackButton';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { Toast } from '../../../components/ui/Toast';
import { CollapsibleSection } from '../../../components/ui/CollapsibleSection';
import { GroupMembersPanel } from '../../../components/groups/GroupMembersPanel';
import { ProposalSummary } from '../../../components/groups/ProposalSummary';
import { ProjectActivityTimeline } from '../../../components/groups/ProjectActivityTimeline';
import { TaskReview } from '../../../components/groups/TaskReview';
import { GroupAcademicRepair } from '../../../components/groups/GroupAcademicRepair';
import { useLiveRefresh } from '../../../hooks/useLiveRefresh';

export const ProjectDetailWorkspace = () => {
  const { groupId } = useParams();
  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const load = useCallback(async () => {
    try {
      const result = await managerGroupsApi.getWorkspace(groupId);
      setWorkspace(result.data);
      setError('');
      setErrorCode(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Workspace could not be loaded. Please retry.');
      setErrorCode(err.response?.status);
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    load();
  }, [load]);

  useLiveRefresh(load);

  const exportReport = async () => {
    if (!workspace?.group) return;
    setExporting(true);
    try {
      const blob = await managerGroupsApi.exportPerformance(groupId);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${workspace.group.name || 'group'}_performance.xlsx`;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setToast({ message: 'Performance report exported successfully!', type: 'success' });
    } catch {
      setToast({ message: 'Performance export failed. Please retry.', type: 'error' });
    } finally {
      setExporting(false);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="page-frame-container">
        <BackButton to="/manager/groups" label="Back to All Groups" />
        <ContentLoader label="Loading project workspace..." />
      </div>
    );
  }

  const group = workspace?.group;
  const members = workspace?.members || group?.members || [];
  const milestones = workspace?.timeline?.flatMap((s) => s.milestones || []) || [];

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <BackButton to="/manager/groups" label="Back to All Groups" />

      {error && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #fecaca',
            padding: '24px',
            marginBottom: '20px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
            textAlign: 'center',
          }}
        >
          <AlertCircle size={36} color="#dc2626" style={{ margin: '0 auto 10px' }} />
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b', marginBottom: '6px' }}>
            {errorCode === 404 ? 'Group Not Found' : errorCode === 403 ? 'Access Denied' : 'Workspace Unavailable'}
          </h2>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '16px' }}>
            {error}
          </p>
          {errorCode !== 404 && (
            <button type="button" className="btn btn-secondary" onClick={load}>
              Retry Loading Workspace
            </button>
          )}
        </div>
      )}

      {group && (
        <>
          <PageHeader
            title={group.project_title || group.name}
            subtitle={`Group: ${group.name} • Dept: ${group.dept || 'Needs Correction'} (Sec ${group.section || 'N/A'}) • Course: ${group.course || 'Needs Correction'} • Status: ${(group.review_stage || group.status || '').replaceAll('_', ' ')}`}
          >
            <button
              type="button"
              className="btn btn-primary"
              disabled={exporting}
              onClick={exportReport}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              {exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
              <span>{exporting ? 'Exporting...' : 'Export Performance'}</span>
            </button>
          </PageHeader>

          {workspace.warnings?.map((warning) => (
            <div
              key={warning}
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                padding: '12px 16px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ flexShrink: 0 }} />
                <span>{warning}</span>
              </div>
              <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                Retry
              </button>
            </div>
          ))}

          {group.academic_link_needs_review && (
            <div style={{ marginBottom: '20px' }}>
              <GroupAcademicRepair group={group} onSaved={load} />
            </div>
          )}

          {/* Super-Organized 2-Column Grid Layout */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(280px, 340px) minmax(0, 1fr)',
              gap: '24px',
              alignItems: 'flex-start',
            }}
            className="classroom-grid"
          >
            {/* Left Column: Group Members & Supervisor */}
            <aside>
              <GroupMembersPanel
                members={members}
                supervisorName={group.supervisor_name}
                supervisorEmail={group.supervisor_email}
                maxMembers={group.max_group || 4}
              />
            </aside>

            {/* Right Column: 3 Dropdown / Collapsible Sections */}
            <main style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {/* Dropdown 1: Project Proposal & Scope */}
              <CollapsibleSection
                title="Project Proposal & Scope"
                subtitle="Project problem statement, objectives, and attached proposal document"
                icon={FileText}
                defaultOpen={true}
              >
                <ProposalSummary proposal={workspace.proposal} />
              </CollapsibleSection>

              {/* Dropdown 2: Sprint Milestone Deliverables / Activity */}
              <CollapsibleSection
                title="Sprint Milestone Deliverables & Activity"
                subtitle="Review individual sprint submissions, deliverables, rubrics, and feedback"
                icon={Layers}
                badge={milestones.length > 0 ? `${milestones.length} Milestones` : 'No Milestones'}
                defaultOpen={false}
              >
                {milestones.length === 0 ? (
                  <div style={{ padding: '16px 0', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No applicable sprint milestones configured for this group yet.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {workspace.timeline?.map((sprint) => (
                      <div key={sprint.sprint_id || sprint.name} style={{ marginBottom: '10px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#475569', marginBottom: '8px', textTransform: 'uppercase' }}>
                          {sprint.name}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                          {sprint.milestones?.map((m) => (
                            <details
                              key={m.milestone_id}
                              style={{
                                backgroundColor: '#f8fafc',
                                border: '1px solid #e2e8f0',
                                borderRadius: '6px',
                                overflow: 'hidden',
                                padding: '10px 14px',
                              }}
                            >
                              <summary
                                style={{
                                  fontWeight: 600,
                                  fontSize: '13.5px',
                                  color: '#1e293b',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                }}
                              >
                                <span>{m.title}</span>
                                <span
                                  style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: m.submission ? '#eafbf1' : '#f1f5f9',
                                    color: m.submission ? '#16a34a' : '#64748b',
                                  }}
                                >
                                  {m.submission ? 'Submitted' : 'Not submitted'}
                                </span>
                              </summary>
                              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
                                <TaskReview groupId={groupId} taskId={m.milestone_id} />
                              </div>
                            </details>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CollapsibleSection>

              {/* Dropdown 3: Sprint Milestone & Performance Timeline */}
              <CollapsibleSection
                title="Sprint Milestone & Performance Timeline"
                subtitle="Chronological audit timeline of milestones, reviews, and activity"
                icon={Clock}
                defaultOpen={false}
              >
                <ProjectActivityTimeline timeline={workspace.timeline || []} />
              </CollapsibleSection>
            </main>
          </div>
        </>
      )}
    </div>
  );
};
