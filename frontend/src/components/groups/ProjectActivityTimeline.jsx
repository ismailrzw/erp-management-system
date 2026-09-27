import React from 'react';
import {
  Users,
  GraduationCap,
  FileText,
  Target,
  Award,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Layers,
  Download,
  ExternalLink,
  Sliders,
  AlertTriangle,
} from 'lucide-react';

const formatHumanDateTime = (isoString) => {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return d.toLocaleDateString('en-PK', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return String(isoString);
  }
};

const getMilestoneState = (milestone) => {
  const now = new Date();
  const deadline = milestone.deadline ? new Date(milestone.deadline) : null;
  const sub = milestone.submission;
  const ev = milestone.evaluation;

  if (ev && (ev.marks_awarded !== undefined || ev.total_weighted_score !== undefined)) {
    return {
      type: 'graded',
      label: 'Graded & Evaluated',
      badgeBg: '#ecfdf5',
      badgeText: '#059669',
      badgeBorder: '#a7f3d0',
      icon: CheckCircle2,
    };
  }

  if (sub) {
    if (sub.is_late) {
      return {
        type: 'late',
        label: 'Delivered (Late)',
        badgeBg: '#fffbeb',
        badgeText: '#b45309',
        badgeBorder: '#fde68a',
        icon: AlertTriangle,
      };
    }
    return {
      type: 'delivered',
      label: 'Delivered (On Time)',
      badgeBg: '#ecfdf5',
      badgeText: '#059669',
      badgeBorder: '#a7f3d0',
      icon: CheckCircle2,
    };
  }

  if (deadline && now > deadline) {
    return {
      type: 'overdue',
      label: 'Missed / Overdue',
      badgeBg: '#fef2f2',
      badgeText: '#dc2626',
      badgeBorder: '#fecaca',
      icon: AlertCircle,
    };
  }

  return {
    type: 'in_progress',
    label: 'In Progress',
    badgeBg: '#eff6ff',
    badgeText: '#2563eb',
    badgeBorder: '#bfdbfe',
    icon: Clock,
  };
};

export const ProjectActivityTimeline = ({
  timeline = [],
  events = [],
  title = 'Sprint Milestones & Project Activity Timeline',
  showExport = false,
  onExport,
}) => {
  // Support either timeline (hierarchical Sprints with milestones) or events (flat events list)
  const dataList = timeline && timeline.length > 0 ? timeline : events;

  if (!dataList || dataList.length === 0) {
    return (
      <div
        style={{
          padding: '36px 20px',
          textAlign: 'center',
          backgroundColor: '#f8fafc',
          borderRadius: '8px',
          border: '1px dashed #cbd5e1',
        }}
      >
        <Clock size={32} color="#94a3b8" style={{ margin: '0 auto 10px' }} />
        <div style={{ fontWeight: 600, color: '#475569', fontSize: '14px' }}>
          No Milestones or Activity Recorded Yet
        </div>
        <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '4px' }}>
          Sprint deliverables, submission timeliness, and evaluation marks will appear here chronologically as the project progresses.
        </div>
      </div>
    );
  }

  // Check if data is structured Sprints
  const isSprintStructure = Array.isArray(dataList) && dataList[0] && ('milestones' in dataList[0] || 'sprint_name' in dataList[0]);

  if (isSprintStructure) {
    return (
      <div className="project-sprint-timeline" style={{ width: '100%' }}>
        {title && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '18px',
              paddingBottom: '10px',
              borderBottom: '1px solid #f1f5f9',
              flexWrap: 'wrap',
              gap: '10px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} color="#4f46e5" />
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                {title}
              </h3>
            </div>

            {showExport && onExport && (
              <button
                type="button"
                onClick={onExport}
                className="btn btn-secondary btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Download size={13} />
                <span>Export Performance Excel</span>
              </button>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {dataList.map((sprint, sIdx) => {
            const sprintName = sprint.sprint_name || `Sprint ${sIdx + 1}`;
            const sprintDesc = sprint.sprint_description || '';
            const milestones = sprint.milestones || [];

            return (
              <div
                key={sprintName + sIdx}
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Sprint Header Banner */}
                <div
                  style={{
                    backgroundColor: '#f8fafc',
                    padding: '12px 18px',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Layers size={16} color="#4f46e5" />
                    <span style={{ fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                      {sprintName}
                    </span>
                    {sprintDesc && (
                      <span style={{ fontSize: '12px', color: '#64748b' }}>
                        • {sprintDesc}
                      </span>
                    )}
                  </div>

                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: 600,
                      backgroundColor: '#e0e7ff',
                      color: '#4338ca',
                      padding: '2px 8px',
                      borderRadius: '12px',
                    }}
                  >
                    {milestones.length} Milestone{milestones.length === 1 ? '' : 's'}
                  </span>
                </div>

                {/* Milestones Inside Sprint */}
                {milestones.length === 0 ? (
                  <div style={{ padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
                    No milestones configured in this sprint.
                  </div>
                ) : (
                  <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {milestones.map((m, mIdx) => {
                      const state = getMilestoneState(m);
                      const StateIcon = state.icon;
                      const sub = m.submission;
                      const ev = m.evaluation;

                      return (
                        <div
                          key={m.milestone_id || mIdx}
                          style={{
                            border: `1px solid ${state.type === 'overdue' ? '#fecaca' : '#e2e8f0'}`,
                            borderRadius: '8px',
                            padding: '14px 16px',
                            backgroundColor: state.type === 'overdue' ? '#fffbfb' : '#ffffff',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '10px',
                          }}
                        >
                          {/* Top Row: Title, Order & Status Badge */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  fontSize: '11.5px',
                                  fontWeight: 700,
                                  color: '#4f46e5',
                                  backgroundColor: '#eef2ff',
                                  padding: '2px 7px',
                                  borderRadius: '4px',
                                  fontFamily: 'monospace',
                                }}
                              >
                                M{m.milestone_order || mIdx + 1}
                              </span>
                              <span style={{ fontWeight: 600, fontSize: '14px', color: '#1e293b' }}>
                                {m.title}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              {ev && ev.marks_awarded !== undefined && (
                                <span
                                  style={{
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    color: '#059669',
                                    backgroundColor: '#d1fae5',
                                    padding: '2px 8px',
                                    borderRadius: '4px',
                                  }}
                                >
                                  Score: {ev.marks_awarded} / {ev.max_marks || 100}
                                </span>
                              )}

                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '3px 9px',
                                  borderRadius: '12px',
                                  fontSize: '11.5px',
                                  fontWeight: 600,
                                  backgroundColor: state.badgeBg,
                                  color: state.badgeText,
                                  border: `1px solid ${state.badgeBorder}`,
                                }}
                              >
                                <StateIcon size={12} />
                                <span>{state.label}</span>
                              </span>
                            </div>
                          </div>

                          {/* Middle Row: Deadline & Instructions */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12.5px', color: '#64748b', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                              <Calendar size={13} style={{ color: '#94a3b8' }} />
                              <span>Deadline: <strong>{formatHumanDateTime(m.deadline)}</strong></span>
                            </div>

                            {m.rubrics_count > 0 && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#4f46e5', fontWeight: 500 }}>
                                <Sliders size={13} />
                                <span>{m.rubrics_count} Rubric Criteria Attached</span>
                              </div>
                            )}
                          </div>

                          {m.details && (
                            <div style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.45', backgroundColor: '#f8fafc', padding: '8px 12px', borderRadius: '6px' }}>
                              {m.details}
                            </div>
                          )}

                          {/* Bottom Row: Submission Artifacts & Evaluator Feedback */}
                          {sub && (
                            <div
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                backgroundColor: sub.is_late ? '#fffbeb' : '#f0fdf4',
                                border: `1px solid ${sub.is_late ? '#fde68a' : '#bbf7d0'}`,
                                padding: '8px 12px',
                                borderRadius: '6px',
                                fontSize: '12.5px',
                                flexWrap: 'wrap',
                                gap: '8px',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <FileText size={14} color={sub.is_late ? '#b45309' : '#15803d'} />
                                <span>
                                  Submitted on <strong>{formatHumanDateTime(sub.submitted_at)}</strong>
                                  {sub.is_late && <span style={{ color: '#dc2626', fontWeight: 600, marginLeft: '6px' }}>(Late Submission)</span>}
                                </span>
                              </div>

                              {(sub.file_url || sub.submission_url) && (
                                <a
                                  href={sub.file_url || sub.submission_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="btn btn-secondary btn-sm"
                                  style={{ fontSize: '11.5px', padding: '3px 8px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                                >
                                  <ExternalLink size={12} />
                                  <span>View Deliverable</span>
                                </a>
                              )}
                            </div>
                          )}

                          {ev && ev.feedback && (
                            <div style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', backgroundColor: '#f1f5f9', padding: '6px 10px', borderRadius: '4px' }}>
                              <strong>Supervisor Remarks:</strong> "{ev.feedback}"
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Fallback rendering for flat chronological event lists
  return (
    <div className="project-activity-timeline" style={{ width: '100%' }}>
      {title && (
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
            <Calendar size={18} color="#475569" />
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              {title}
            </h3>
          </div>
          <span
            style={{
              fontSize: '12px',
              color: '#64748b',
              backgroundColor: '#f1f5f9',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 500,
            }}
          >
            {dataList.length} event{dataList.length === 1 ? '' : 's'}
          </span>
        </div>
      )}

      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        <div
          style={{
            position: 'absolute',
            left: '11px',
            top: '12px',
            bottom: '12px',
            width: '2px',
            backgroundColor: '#e2e8f0',
          }}
        />

        {dataList.map((ev, idx) => {
          const isLast = idx === dataList.length - 1;
          return (
            <div key={idx} style={{ position: 'relative', marginBottom: isLast ? '0' : '18px' }}>
              <div
                style={{
                  position: 'absolute',
                  left: '-24px',
                  top: '0px',
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  border: '2px solid #cbd5e1',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 2,
                }}
              >
                <CheckCircle2 size={14} color="#2563eb" />
              </div>

              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '12px 14px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, fontSize: '13.5px', color: '#1e293b' }}>
                    {ev.title || ev.name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>
                    {formatHumanDateTime(ev.timestamp || ev.date || ev.submitted_at)}
                  </span>
                </div>
                {ev.description && (
                  <div style={{ fontSize: '12.5px', color: '#475569' }}>{ev.description}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
