import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { Toast } from '../../../components/ui/Toast';
import { studentIterationsApi } from '../../../api/studentIterationsApi';
import {
  ArrowLeft,
  Download,
  User,
  ClipboardList,
  Plus,
  X,
  File,
  Paperclip,
  Award,
} from 'lucide-react';

const formatHumanDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
};

const formatHumanTime = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const IterationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [iteration, setIteration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [mountTime] = useState(() => Date.now());

  const fetchDetail = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentIterationsApi.getById(id);
      setIteration(res.data);
      if (res.data?.submission?.note) {
        setNote(res.data.submission.note);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to fetch iteration details.';
      setToast({ type: 'error', message: msg });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const hasSubmission = Boolean(iteration?.has_submitted);
  const isPastDeadline = Boolean(iteration?.deadline && new Date(iteration.deadline).getTime() < mountTime);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile && !hasSubmission) {
      setToast({ type: 'error', message: 'Please select a file to turn in.' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      if (selectedFile) {
        formData.append('file', selectedFile);
      }
      if (note.trim()) {
        formData.append('note', note.trim());
      }

      const res = await studentIterationsApi.submit(id, formData);
      setToast({ type: 'success', message: res.message || 'Work turned in successfully.' });
      setSelectedFile(null);
      fetchDetail();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit work.';
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px 32px' }}>
        <ContentLoader label="Loading assignment details..." />
      </div>
    );
  }
  if (!iteration) return null;

  const submission = iteration.submission;
  const rubrics = iteration.rubrics || [];
  const totalPoints = rubrics.reduce((sum, r) => sum + Number(r.weight || 0), 0);

  const studentEval = iteration.student_evaluation;

  // Work Status pill calculation
  let statusText = 'Assigned';
  let statusBg = '#e8f0fe';
  let statusColor = '#1a73e8';

  if (studentEval) {
    statusText = `Graded: ${studentEval.total_weighted_score}/${studentEval.max_possible_score || totalPoints}`;
    statusBg = '#e6f4ea';
    statusColor = '#137333';
  } else if (hasSubmission) {
    if (submission?.is_late) {
      statusText = 'Turned in (Late)';
      statusBg = '#fef3c7';
      statusColor = '#b45309';
    } else {
      statusText = 'Turned in';
      statusBg = '#e6f4ea';
      statusColor = '#137333';
    }
  } else if (isPastDeadline) {
    statusText = 'Missing';
    statusBg = '#fce8e6';
    statusColor = '#c5221f';
  }


  return (
    <div style={{ backgroundColor: '#ffffff', minHeight: '100vh', padding: '24px 32px' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      {/* Back Button */}
      <button
        type="button"
        onClick={() => navigate('/student/iterations')}
        className="btn btn-back"
        style={{ marginBottom: '20px' }}
      >
        <ArrowLeft size={16} />
        Back to Class Iterations
      </button>

      {/* Main Google Classroom Layout Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) 340px',
          gap: '32px',
          maxWidth: '1180px',
          margin: '0 auto',
        }}
      >
        {/* LEFT COLUMN: Main Task Assignment */}
        <div>
          {/* Header Row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px' }}>
            {/* Green Classroom Clipboard Icon */}
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '50%',
                backgroundColor: '#e6f4ea',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: '4px',
              }}
            >
              <ClipboardList size={24} style={{ color: '#137333' }} />
            </div>

            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '26px', fontWeight: 500, color: '#202124', letterSpacing: '-0.01em' }}>
                  {iteration.title}
                </h1>
              </div>

              <div style={{ fontSize: '13px', color: '#5f6368', marginBottom: '4px' }}>
                <span>PBL Manager / Evaluator</span>
                {iteration.createdAt && <span> • {formatHumanDate(iteration.createdAt)}</span>}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px', borderBottom: '1px solid #dadce0', paddingBottom: '14px' }}>
                <span style={{ fontSize: '13.5px', fontWeight: 500, color: '#3c4043' }}>
                  {totalPoints > 0 ? `${totalPoints} points` : 'Graded Milestone'}
                </span>
                {iteration.deadline && (
                  <span style={{ fontSize: '13.5px', fontWeight: 500, color: isPastDeadline && !hasSubmission ? '#c5221f' : '#3c4043' }}>
                    Due {formatHumanDate(iteration.deadline)}, {formatHumanTime(iteration.deadline)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Details / Instructions Body */}
          <div style={{ marginTop: '20px', fontSize: '14px', color: '#3c4043', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {iteration.details || 'No additional instructions provided for this milestone.'}
          </div>

          {/* Attached Document Card (if provided by manager) */}
          {iteration.document_url && (
            <div style={{ marginTop: '20px' }}>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#5f6368', marginBottom: '8px' }}>
                Attachment Guidelines
              </div>
              <a
                href={iteration.document_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #dadce0',
                  backgroundColor: '#ffffff',
                  color: '#1a73e8',
                  textDecoration: 'none',
                  fontSize: '13.5px',
                  fontWeight: 500,
                  maxWidth: '380px',
                  boxShadow: '0 1px 2px rgba(60,64,67,0.08)',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '6px', backgroundColor: '#e8f0fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Paperclip size={18} style={{ color: '#1a73e8' }} />
                </div>
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <div style={{ fontWeight: 600, color: '#202124', fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {iteration.document_name || 'Guidelines Document'}
                  </div>
                  <div style={{ fontSize: '11.5px', color: '#5f6368', marginTop: '2px' }}>Click to download file</div>
                </div>
              </a>
            </div>
          )}

          {/* Rubric Criteria Preview (Before Grading) */}
          {!studentEval && rubrics && rubrics.length > 0 && (
            <div
              style={{
                marginTop: '24px',
                border: '1px solid #e2e8f0',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.04)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '14px 20px',
                  backgroundColor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                  <Award size={18} color="#4f46e5" />
                  <span style={{ fontSize: '14.5px', fontWeight: 700 }}>Grading Rubric Criteria</span>
                </div>
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {rubrics.length} Criteria • Total {totalPoints} Points
                </span>
              </div>

              <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {rubrics.map((r, idx) => (
                  <div
                    key={r.id || idx}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      backgroundColor: '#f8fafc',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                        {idx + 1}. {r.question}
                      </span>
                      <span style={{ fontSize: '12px', fontWeight: 700, color: '#4f46e5' }}>
                        {r.weight} pts
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Official Rubric Evaluation Results Card (if evaluated by manager or evaluator) */}
          {studentEval && (
            <div
              style={{
                marginTop: '28px',
                border: '1px solid #bbf7d0',
                borderRadius: '12px',
                backgroundColor: '#ffffff',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  backgroundColor: '#f0fdf4',
                  borderBottom: '1px solid #bbf7d0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                }}
              >
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#166534' }}>
                    <Award size={20} />
                    <span style={{ fontSize: '15px', fontWeight: 700 }}>Official Rubric Evaluation</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#15803d', marginTop: '2px' }}>
                    Graded by {studentEval.evaluator_name || 'PBL Manager'}
                    {studentEval.graded_at && ` on ${new Date(studentEval.graded_at).toLocaleDateString()}`}
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                  <span style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>
                    {studentEval.total_weighted_score}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#166534' }}>
                    / {studentEval.max_possible_score} pts ({studentEval.percentage}%)
                  </span>
                </div>
              </div>

              {/* Rubric Criteria Breakdown */}
              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#334155', marginBottom: '12px' }}>
                  Criteria Breakdown
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {(studentEval.rubric_snapshot || rubrics).map((r, idx) => {
                    const key = String(r.id ?? idx + 1);
                    const lvl = studentEval.scores?.[key] !== undefined ? studentEval.scores[key] : 0;
                    const weight = Number(r.weight) || 0;
                    const earned = Math.round((lvl / 5.0) * weight * 100) / 100;
                    const desc = r.levels?.[String(lvl)] || r.levels?.[lvl] || '';

                    return (
                      <div
                        key={key}
                        style={{
                          padding: '10px 14px',
                          borderRadius: '8px',
                          border: '1px solid #e2e8f0',
                          backgroundColor: '#f8fafc',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                            {idx + 1}. {r.question}
                          </span>
                          <span style={{ fontSize: '12px', fontWeight: 700, color: '#059669', whiteSpace: 'nowrap' }}>
                            {earned} / {weight} pts (Level {lvl})
                          </span>
                        </div>
                        {desc && (
                          <div style={{ fontSize: '12px', color: '#64748b', lineHeight: 1.4 }}>
                            {desc}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Manager Feedback */}
                {studentEval.feedback && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '12px 16px',
                      backgroundColor: '#f8fafc',
                      borderRadius: '8px',
                      borderLeft: '4px solid #16a34a',
                    }}
                  >
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                      Instructor Feedback
                    </div>
                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                      {studentEval.feedback}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Google Classroom "Your work" & Comments Cards */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* CARD 1: "Your work" Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #dadce0',
              padding: '20px 24px',
              boxShadow: '0 1px 3px rgba(60,64,67,0.12)',
            }}
          >
            {/* Header: Title & Status Badge */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <span style={{ fontSize: '18px', fontWeight: 500, color: '#202124' }}>
                Your work
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  backgroundColor: statusBg,
                  color: statusColor,
                }}
              >
                {statusText}
              </span>
            </div>

            {/* Submitted File View (if turned in) */}
            {hasSubmission && submission && !selectedFile && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid #dadce0', backgroundColor: '#f8f9fa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                    <File size={18} style={{ color: '#1a73e8', flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#202124', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {submission.file_name}
                    </span>
                  </div>
                  {submission.file_url && (
                    <a
                      href={submission.file_url}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: '#1a73e8', display: 'flex', alignItems: 'center' }}
                      title="Download file"
                    >
                      <Download size={16} />
                    </a>
                  )}
                </div>
                {submission.submitted_at && (
                  <div style={{ fontSize: '11.5px', color: '#5f6368', marginTop: '6px', textAlign: 'right' }}>
                    Turned in on {new Date(submission.submitted_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}

            {/* File Selected Preview (before submitting) */}
            {selectedFile && (
              <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '8px', border: '1px solid #1a73e8', backgroundColor: '#e8f0fe' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
                  <File size={18} style={{ color: '#1a73e8', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1a73e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedFile.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="btn btn-back"
                >
                  <X size={16} />
                </button>
              </div>
            )}

            {/* Hidden File Input & "+ Add or create" Button */}
            <input
              type="file"
              id="student-file-input"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])}
            />

            {!selectedFile && (
              <label
                htmlFor="student-file-input"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '9px 16px',
                  borderRadius: '24px',
                  border: '1px solid #dadce0',
                  backgroundColor: '#ffffff',
                  color: '#1a73e8',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  marginBottom: '12px',
                  transition: 'background-color 0.15s ease',
                }}
              >
                <Plus size={16} />
                <span>{hasSubmission ? 'Attach replacement file' : 'Add or create'}</span>
              </label>
            )}

            {/* Main Action Button ("Turn in" / "Mark as done" / "Unsubmit") */}
            <form onSubmit={handleSubmit}>
              <button
                type="submit"
                disabled={submitting || (!selectedFile && !hasSubmission)}
                className="btn btn-primary"
                style={{ width: '100%' }}
              >
                {submitting
                  ? 'Submitting...'
                  : hasSubmission && !selectedFile
                  ? 'Re-submit Work'
                  : 'Turn in'}
              </button>
            </form>
          </div>

          {/* CARD 2: "Private comments" Card */}
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '12px',
              border: '1px solid #dadce0',
              padding: '18px 20px',
              boxShadow: '0 1px 3px rgba(60,64,67,0.12)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', fontWeight: 500, color: '#202124', marginBottom: '12px' }}>
              <User size={18} style={{ color: '#5f6368' }} />
              <span>Private comments</span>
            </div>

            <div>
              <textarea
                rows={3}
                placeholder="Add comment to instructor..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #dadce0',
                  fontSize: '13px',
                  color: '#202124',
                  resize: 'vertical',
                  outline: 'none',
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
