import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  Download,
  ArrowLeft,
  Crown,
  CheckCircle2,
  Clock,
  FileText,
  Target,
  Award,
  AlertTriangle,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { managerGroupsApi } from '../../../api/managerGroupsApi';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { ProjectActivityTimeline } from '../../../components/groups/ProjectActivityTimeline';

export const ProjectDetailWorkspace = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const fetchWorkspace = useCallback(async () => {
    try {
      setLoading(true);
      const res = await managerGroupsApi.getWorkspace(groupId);
      if (res.success && res.data) {
        setWorkspace(res.data);
      } else {
        setToast({ message: res.message || 'Failed to load workspace', type: 'error' });
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || err.message || 'Error fetching group workspace',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [groupId]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const handleExportPerformance = async () => {
    try {
      setExporting(true);
      const blob = await managerGroupsApi.exportPerformance(groupId);
      const url = window.URL.createObjectURL(new Blob([blob], { type: 'text/csv' }));
      const link = document.createElement('a');
      link.href = url;
      const groupName = workspace?.group?.name?.replace(/\s+/g, '_') || groupId;
      link.setAttribute('download', `performance_${groupName}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setToast({ message: 'Performance report exported successfully!', type: 'success' });
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to export performance report',
        type: 'error',
      });
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Project Workspace"
          subtitle="Loading group details, milestone submissions, and performance records..."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Groups', to: '/manager/groups' },
            { label: 'Loading Workspace...' },
          ]}
        />
        <ContentLoader label="Retrieving project workspace and timeline..." />
      </div>
    );
  }

  if (!workspace || !workspace.group) {
    return (
      <div className="page-frame-container">
        <PageHeader
          title="Project Not Found"
          subtitle="The requested group or project workspace could not be retrieved."
          breadcrumbs={[
            { label: 'Home', to: '/manager/dashboard' },
            { label: 'Groups', to: '/manager/groups' },
            { label: 'Not Found' },
          ]}
        >
          <button
            type="button"
            onClick={() => navigate('/manager/groups')}
            className="btn btn-secondary"
          >
            <ArrowLeft size={15} />
            <span>Back to Groups</span>
          </button>
        </PageHeader>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '40px 20px',
            textAlign: 'center',
          }}
        >
          <AlertTriangle size={36} color="#eab308" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Group Workspace Unavailable
          </h3>
          <p style={{ color: '#64748b', fontSize: '13.5px', marginBottom: '16px' }}>
            Group record does not exist or may have been archived.
          </p>
          <button
            type="button"
            onClick={() => navigate('/manager/groups')}
            className="btn btn-primary"
          >
            Return to Groups List
          </button>
        </div>
      </div>
    );
  }

  const { group, proposal, submissions = [], exhibition_eval, timeline = [] } = workspace;
  const members = group.members || [];
  const statusColorMap = {
    approved: { bg: '#ecfdf5', text: '#059669', border: '#a7f3d0' },
    active: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
    formed: { bg: '#f8fafc', text: '#475569', border: '#cbd5e1' },
    rejected: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    pending: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  };
  const currentStatusStyle = statusColorMap[group.status?.toLowerCase()] || statusColorMap.formed;

  return (
    <div className="page-frame-container">
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />

      <PageHeader
        title={proposal?.title || group.name}
        subtitle={`Group: ${group.name} • Course: ${group.course_name || group.course_id || 'N/A'}`}
        breadcrumbs={[
          { label: 'Home', to: '/manager/dashboard' },
          { label: 'Groups', to: '/manager/groups' },
          { label: group.name },
        ]}
      >
        <button
          type="button"
          onClick={() => navigate('/manager/groups')}
          className="btn btn-secondary"
        >
          <ArrowLeft size={15} />
          <span>Back to Groups</span>
        </button>

        <button
          type="button"
          onClick={handleExportPerformance}
          disabled={exporting}
          className="btn btn-primary"
        >
          <Download size={15} />
          <span>{exporting ? 'Exporting...' : 'Export Performance (CSV)'}</span>
        </button>
      </PageHeader>

      {/* Main Workspace Layout */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Top Summary Banner */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Group Status
              </div>
              <div style={{ marginTop: '4px' }}>
                <span
                  style={{
                    fontSize: '13px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: currentStatusStyle.bg,
                    color: currentStatusStyle.text,
                    border: `1px solid ${currentStatusStyle.border}`,
                    textTransform: 'capitalize',
                  }}
                >
                  {group.status || 'Formed'}
                </span>
              </div>
            </div>

            <div style={{ height: '36px', width: '1px', backgroundColor: '#e2e8f0' }} />

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Department & Course
              </div>
              <div style={{ marginTop: '4px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                {group.course_dept || 'CS'} • {group.course_name || group.course_id || 'General'}
              </div>
            </div>

            <div style={{ height: '36px', width: '1px', backgroundColor: '#e2e8f0' }} />

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Assigned Supervisor
              </div>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <GraduationCap size={16} color="#7c3aed" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  {group.supervisor_name || 'No Supervisor Assigned'}
                </span>
                {group.supervisor_dept && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>({group.supervisor_dept})</span>
                )}
              </div>
            </div>

            <div style={{ height: '36px', width: '1px', backgroundColor: '#e2e8f0' }} />

            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Team Size
              </div>
              <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={16} color="#2563eb" />
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                  {group.member_count} Registered Member{group.member_count === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={fetchWorkspace}
            className="btn btn-secondary btn-sm"
          >
            <RefreshCw size={13} />
            <span>Refresh Workspace</span>
          </button>
        </div>

        {/* 2-Column Responsive Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '20px' }}>
          {/* Left Column: Team Members & Proposal Details */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Team Members Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Users size={18} color="#2563eb" />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Group Members ({members.length})
                  </h3>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  Leader + Peers
                </span>
              </div>

              <div className="table-responsive-container" style={{ border: 'none', borderRadius: 0 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13.5px' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>Name</th>
                      <th style={{ padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>Roll No</th>
                      <th style={{ padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>Role</th>
                      <th style={{ padding: '10px 16px', color: '#64748b', fontWeight: 600 }}>Email</th>
                    </tr>
                  </thead>
                  <tbody>
                    {members.map((m, idx) => (
                      <tr
                        key={m.id || idx}
                        style={{
                          borderBottom: idx === members.length - 1 ? 'none' : '1px solid #f1f5f9',
                          backgroundColor: m.is_leader ? '#f8faff' : '#ffffff',
                        }}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: m.is_leader ? 600 : 500, color: '#1e293b' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {m.is_leader && <Crown size={15} color="#eab308" />}
                            <span>{m.name}</span>
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', fontFamily: 'monospace' }}>
                          {m.roll_no || 'N/A'}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {m.is_leader ? (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: '#fef9c3',
                                color: '#a16207',
                                border: '1px solid #fde047',
                              }}
                            >
                              Team Leader
                            </span>
                          ) : (
                            <span
                              style={{
                                fontSize: '11px',
                                fontWeight: 500,
                                padding: '2px 8px',
                                borderRadius: '10px',
                                backgroundColor: '#f1f5f9',
                                color: '#64748b',
                              }}
                            >
                              Member
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#64748b', fontSize: '13px' }}>
                          {m.email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Proposal Details Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <FileText size={18} color="#0d9488" />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Project Proposal & Scope
                  </h3>
                </div>
                {proposal && (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 600,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: proposal.status === 'approved' ? '#ecfdf5' : '#fffbeb',
                      color: proposal.status === 'approved' ? '#059669' : '#b45309',
                      border: `1px solid ${proposal.status === 'approved' ? '#a7f3d0' : '#fde68a'}`,
                      textTransform: 'capitalize',
                    }}
                  >
                    Proposal {proposal.status || 'Submitted'}
                  </span>
                )}
              </div>

              {proposal ? (
                <div>
                  <div style={{ marginBottom: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                      Title
                    </div>
                    <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b' }}>
                      {proposal.title || 'Untitled Proposal'}
                    </div>
                  </div>

                  {proposal.problem_statement && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
                        Problem Statement & Objectives
                      </div>
                      <div style={{ fontSize: '13.5px', color: '#475569', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>
                        {proposal.problem_statement}
                      </div>
                    </div>
                  )}

                  {proposal.tech_stack && (
                    <div style={{ marginBottom: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px' }}>
                        Target Tech Stack
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {(Array.isArray(proposal.tech_stack)
                          ? proposal.tech_stack
                          : String(proposal.tech_stack).split(',')
                        ).map((tech, i) => (
                          <span
                            key={i}
                            style={{
                              fontSize: '12px',
                              backgroundColor: '#f1f5f9',
                              color: '#334155',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid #e2e8f0',
                            }}
                          >
                            {tech.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {proposal.feedback && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '12px',
                        marginTop: '12px',
                      }}
                    >
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                        Supervisor Feedback
                      </div>
                      <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic' }}>
                        "{proposal.feedback}"
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                  <FileText size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontSize: '13.5px', color: '#64748b' }}>No formal proposal submitted yet.</div>
                </div>
              )}
            </div>

            {/* Showcase Day Evaluation Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Award size={18} color="#e11d48" />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Exhibition Day Final Evaluation
                  </h3>
                </div>
                {exhibition_eval ? (
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 700,
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: '#fef2f2',
                      color: '#e11d48',
                      border: '1px solid #fecdd3',
                    }}
                  >
                    Evaluated
                  </span>
                ) : (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>Pending Showcase</span>
                )}
              </div>

              {exhibition_eval ? (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Assigned Evaluator</div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                        {exhibition_eval.evaluator_name || 'Evaluator'}
                        {exhibition_eval.evaluator_type && (
                          <span
                            style={{
                              marginLeft: '8px',
                              fontSize: '11px',
                              fontWeight: 600,
                              padding: '1px 6px',
                              borderRadius: '4px',
                              backgroundColor: exhibition_eval.evaluator_type === 'internal' ? '#eff6ff' : '#f5f3ff',
                              color: exhibition_eval.evaluator_type === 'internal' ? '#2563eb' : '#7c3aed',
                            }}
                          >
                            {exhibition_eval.evaluator_type.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>Total Score</div>
                      <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669' }}>
                        {exhibition_eval.total_marks || exhibition_eval.score || 'N/A'}
                      </div>
                    </div>
                  </div>

                  {exhibition_eval.comments && (
                    <div
                      style={{
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '12px',
                        fontSize: '13px',
                        color: '#475569',
                      }}
                    >
                      <strong>Evaluator Comments:</strong> {exhibition_eval.comments}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                  <Award size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontSize: '13.5px', color: '#64748b' }}>
                    Final showcase score will be posted here on exhibition day.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Project Milestones & Activity Timeline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Milestone Submissions Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '16px',
                  paddingBottom: '10px',
                  borderBottom: '1px solid #f1f5f9',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Target size={18} color="#ea580c" />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                    Sprint Milestone Deliverables ({submissions.length})
                  </h3>
                </div>
              </div>

              {submissions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 10px', color: '#94a3b8' }}>
                  <Target size={32} style={{ margin: '0 auto 8px', opacity: 0.5 }} />
                  <div style={{ fontSize: '13.5px', color: '#64748b' }}>
                    No milestone deliverables submitted yet.
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {submissions.map((sub, idx) => (
                    <div
                      key={sub.id || idx}
                      style={{
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px',
                        padding: '12px 14px',
                        backgroundColor: '#fafafa',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '6px',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                          {sub.iteration_name || sub.iteration_id || `Milestone #${idx + 1}`}
                        </span>

                        <span
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: sub.score ? '#ecfdf5' : '#eff6ff',
                            color: sub.score ? '#059669' : '#2563eb',
                            border: `1px solid ${sub.score ? '#a7f3d0' : '#bfdbfe'}`,
                          }}
                        >
                          {sub.score ? `Score: ${sub.score}` : 'Submitted'}
                        </span>
                      </div>

                      {sub.submission_url && (
                        <div style={{ marginBottom: '6px' }}>
                          <a
                            href={sub.submission_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '12.5px',
                              color: '#2563eb',
                              textDecoration: 'none',
                            }}
                          >
                            <span>View Deliverable Link</span>
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      )}

                      {sub.evaluation?.feedback && (
                        <div style={{ fontSize: '12px', color: '#64748b', fontStyle: 'italic', marginTop: '4px' }}>
                          "{sub.evaluation.feedback}"
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chronological Activity Timeline */}
            <div
              style={{
                backgroundColor: '#ffffff',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                padding: '20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              <ProjectActivityTimeline
                timeline={timeline}
                title="Sprint Milestones & Performance Timeline"
                showExport={true}
                onExport={handleExportPerformance}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
