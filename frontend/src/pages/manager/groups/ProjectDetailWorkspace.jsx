import { GroupAcademicRepair } from '../../../components/groups/GroupAcademicRepair';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Download } from 'lucide-react';
import { managerGroupsApi } from '../../../api/managerGroupsApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { ProposalSummary } from '../../../components/groups/ProposalSummary';
import { ProjectActivityTimeline } from '../../../components/groups/ProjectActivityTimeline';
import { TaskReview } from '../../../components/groups/TaskReview';
import { useLiveRefresh } from '../../../hooks/useLiveRefresh';

export const ProjectDetailWorkspace = () => {
  const { groupId } = useParams(); const navigate = useNavigate();
  const [workspace, setWorkspace] = useState(null); const [loading, setLoading] = useState(true);
  const [error, setError] = useState(''); const [errorCode, setErrorCode] = useState(null); const [exporting, setExporting] = useState(false);
  const load = useCallback(async () => {
    try { const result = await managerGroupsApi.getWorkspace(groupId); setWorkspace(result.data); setError(''); setErrorCode(null); }
    catch (err) { setError(err.response?.data?.message || 'Workspace could not be loaded. Please retry.'); setErrorCode(err.response?.status); }
    finally { setLoading(false); }
  }, [groupId]);
  useEffect(() => { load(); }, [load]); useLiveRefresh(load);
  const exportReport = async () => {
    setExporting(true);
    try { const blob = await managerGroupsApi.exportPerformance(groupId); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${workspace.group.name}_performance.xlsx`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
    catch { setError('Performance export failed. Please retry.'); }
    finally { setExporting(false); }
  };
  return <main className="page-frame-container">
    <button className="btn btn-back" onClick={() => navigate('/manager/groups')}><ArrowLeft size={18} />Back to All Groups</button>
    {loading && <ContentLoader label="Loading project workspace…" />}
    {error && <section className="workflow-card" role="alert"><h2>{errorCode === 404 ? 'Group Not Found' : errorCode === 403 ? 'Access Denied' : 'Workspace Unavailable'}</h2><p>{error}</p>{errorCode !== 404 && <button className="btn btn-secondary" onClick={load}>Retry</button>}</section>}
    {workspace?.group && <>
      <PageHeader title={workspace.group.project_title || workspace.group.name} subtitle={`${workspace.group.name} · ${workspace.group.dept || 'Department needs correction'} · ${workspace.group.course || 'Course needs correction'} · ${(workspace.group.review_stage || workspace.group.status).replaceAll('_', ' ')}`}>
        <button className="btn btn-primary" disabled={exporting} onClick={exportReport}><Download size={16} />{exporting ? 'Exporting…' : 'Export Performance'}</button>
      </PageHeader>
      {workspace.warnings?.map((warning) => <p role="alert" key={warning} className="workflow-error">{warning} <button className="btn btn-secondary btn-sm" onClick={load}>Retry</button></p>)}
      <div className="workflow-columns"><aside>
        <section className="workflow-card"><h3>Group Members</h3>{(workspace.members || workspace.group.members || []).map((member) => <article key={member.id} style={{ marginBottom: '16px' }}><strong>{member.name}{member.is_leader ? ' · Leader' : ''}</strong><p>Roll: {member.roll || 'Needs correction'}</p><p>{member.email}</p><p>Department: {member.dept || 'Needs correction'}</p></article>)}</section>
        <section className="workflow-card supervisor-standard-card"><h3>Project Supervisor</h3><p>{workspace.group.supervisor_name || 'Awaiting Supervisor acceptance'}</p></section>
      </aside><div>
        {workspace.group.academic_link_needs_review && <GroupAcademicRepair group={workspace.group} onSaved={load} />}
        <ProposalSummary proposal={workspace.proposal} />
        <section className="workflow-card"><h3>Sprint Milestone Deliverables / Activity</h3>{!workspace.timeline?.length && <p>No applicable milestones yet.</p>}{workspace.timeline?.flatMap((s) => s.milestones).map((m) => <details key={m.milestone_id}><summary>{m.title} · {m.submission ? 'Submitted' : 'Not submitted'}</summary><TaskReview groupId={groupId} taskId={m.milestone_id} /></details>)}</section>
        <h3>Sprint Milestones &amp; Performance Timeline</h3><ProjectActivityTimeline timeline={workspace.timeline || []} />
      </div></div>
    </>}
  </main>;
};
