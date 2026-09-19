import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Users, FileText, Download, Calendar, Plus } from 'lucide-react';
import { evaluatorApi } from '../../../api/evaluatorApi';
import { EvaluationSheet } from '../evaluations/EvaluationSheet';
import { MeetingFormModal } from '../meetings/MeetingFormModal';

export function GroupEvalDetail() {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('iterations'); // 'iterations' | 'meetings'
  const [selectedIterationId, setSelectedIterationId] = useState(null);
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  function loadGroupDetail() {
    evaluatorApi.getGroupDetail(groupId)
      .then(res => {
        if (res.data?.success) {
          const gData = res.data.data;
          setGroup(gData);
          if (gData.iterations?.length > 0 && !selectedIterationId) {
            setSelectedIterationId(gData.iterations[0].id);
          }
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadGroupDetail(); }, [groupId]);

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading group details...</div>;
  }

  if (!group) {
    return <div style={{ padding: '40px', textAlign: 'center', color: '#dc2626' }}>Group not found or access denied.</div>;
  }

  const selectedIteration = group.iterations?.find(i => i.id === selectedIterationId) || group.iterations?.[0];

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <button
        type="button"
        className="btn btn-back"
        style={{ marginBottom: '16px' }}
        onClick={() => navigate('/evaluator/groups')}
      >
        <ArrowLeft size={16} />
        <span>Back to Groups</span>
      </button>

      {/* Group Header Card */}
      <div style={{
        background: '#ffffff',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              {group.name}
            </h1>
            <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#64748b', marginTop: '6px' }}>
              <span>Course: <strong>{group.course}</strong></span>
              <span>Dept: <strong>{group.dept}</strong></span>
            </div>
          </div>
          <span style={{
            background: '#e0f2fe',
            color: '#0369a1',
            padding: '4px 12px',
            borderRadius: '12px',
            fontSize: '12px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}>
            {group.status}
          </span>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', alignSelf: 'center' }}>Members:</span>
          {group.members?.map(m => (
            <span key={m.id} style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              padding: '4px 10px',
              borderRadius: '6px',
              fontSize: '12px',
              color: '#334155',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}>
              <Users size={12} color="#64748b" />
              <span>{m.name} ({m.roll || m.email})</span>
            </span>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', marginBottom: '24px' }}>
        <button
          type="button"
          onClick={() => setActiveTab('iterations')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'iterations' ? 'var(--primary)' : '#64748b',
            borderBottom: activeTab === 'iterations' ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          Milestone Iterations ({group.iterations?.length || 0})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          style={{
            padding: '10px 18px',
            fontSize: '14px',
            fontWeight: 600,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: activeTab === 'meetings' ? 'var(--primary)' : '#64748b',
            borderBottom: activeTab === 'meetings' ? '2px solid var(--primary)' : '2px solid transparent',
          }}
        >
          Supervision Meetings ({group.meetings?.length || 0})
        </button>
      </div>

      {/* Tab 1: Iterations */}
      {activeTab === 'iterations' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '24px' }}>
          {/* Left Column: Iterations List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {group.iterations?.map((it) => {
              const isSelected = it.id === selectedIterationId;
              return (
                <div
                  key={it.id}
                  onClick={() => setSelectedIterationId(it.id)}
                  style={{
                    padding: '14px 16px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--primary)' : '1px solid #e2e8f0',
                    background: isSelected ? 'var(--primary-light)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 600, fontSize: '13.5px', color: isSelected ? 'var(--primary)' : '#1e293b' }}>
                      {it.title}
                    </span>
                    {it.evaluated ? (
                      <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                        Evaluated
                      </span>
                    ) : (
                      <span style={{ background: '#fef3c7', color: '#b45309', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>
                        Pending
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                    Due: {it.deadline ? new Date(it.deadline).toLocaleDateString() : 'No deadline'}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Selected Iteration Evaluation & Submission */}
          <div>
            {selectedIteration ? (
              <div>
                {/* Submission View Card */}
                <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '20px', marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', marginBottom: '12px' }}>
                    Student Submission
                  </h3>
                  {selectedIteration.has_submission ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: '#f8fafc',
                      border: '1px solid #cbd5e1',
                      padding: '12px 16px',
                      borderRadius: '8px',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <FileText size={20} color="var(--primary)" />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a' }}>
                            {selectedIteration.submission.file_name || 'Submission File'}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            Submitted on {new Date(selectedIteration.submission.submitted_at).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {selectedIteration.submission.file_url && (
                        <a
                          href={selectedIteration.submission.file_url}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-ghost btn-sm"
                          style={{ textDecoration: 'none' }}
                        >
                          <Download size={14} />
                          <span>Download</span>
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontSize: '13px', color: '#64748b', fontStyle: 'italic', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
                      No submission file uploaded by student yet.
                    </div>
                  )}
                </div>

                {/* Rubric Evaluation Form */}
                <EvaluationSheet
                  groupId={groupId}
                  iterationId={selectedIteration.id}
                  rubrics={selectedIteration.rubrics || []}
                  existingEval={selectedIteration.evaluation}
                  onSubmitSuccess={loadGroupDetail}
                  members={group.members || []}
                />
              </div>
            ) : (
              <div style={{ padding: '20px', color: '#64748b' }}>Select a milestone iteration to evaluate.</div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Supervision Meetings */}
      {activeTab === 'meetings' && (
        <div style={{ background: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Supervision Meeting Log
            </h3>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => setShowMeetingModal(true)}
            >
              <Plus size={16} />
              <span>Log Meeting</span>
            </button>
          </div>

          {group.meetings?.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: '#64748b' }}>
              No supervision meetings logged for this group yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {group.meetings?.map((m) => (
                <div key={m.id} style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                  padding: '16px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a' }}>{m.title}</span>
                    <span style={{ fontSize: '12px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={13} />
                      {new Date(m.date).toLocaleDateString()}
                    </span>
                  </div>
                  {m.agenda && (
                    <div style={{ fontSize: '13px', color: '#334155', marginBottom: '6px' }}>
                      <strong>Agenda:</strong> {m.agenda}
                    </div>
                  )}
                  {m.minutes && (
                    <div style={{ fontSize: '13px', color: '#475569', background: '#ffffff', padding: '10px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                      <strong>Minutes / Decision:</strong> {m.minutes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Meeting Form Modal */}
      {showMeetingModal && (
        <MeetingFormModal
          defaultGroupId={groupId}
          assignedGroups={[group]}
          onClose={() => setShowMeetingModal(false)}
          onSuccess={() => {
            setShowMeetingModal(false);
            loadGroupDetail();
          }}
        />
      )}
    </div>
  );
}
