import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { studentIterationsApi } from '../../../api/studentIterationsApi';
import {
  ArrowLeft,
  Calendar,
  FileText,
  Upload,
  CheckCircle2,
  Clock,
  Download,
  AlertCircle,
  User,
  ClipboardList,
  Plus,
  X,
  MessageSquare,
  File,
  Paperclip,
  Check
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

  if (loading) return <Preloader label="Loading assignment details..." />;
  if (!iteration) return null;

  const hasSubmission = iteration.has_submitted;
  const submission = iteration.submission;
  const rubrics = iteration.rubrics || [];
  const totalPoints = rubrics.reduce((sum, r) => sum + Number(r.weight || 0), 0);

  // Check if overdue
  const isPastDeadline = iteration.deadline ? new Date(iteration.deadline).getTime() < Date.now() : false;

  // Work Status pill calculation
  let statusText = 'Assigned';
  let statusBg = '#e8f0fe';
  let statusColor = '#1a73e8';

  if (hasSubmission) {
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
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          background: 'none',
          border: 'none',
          color: '#5f6368',
          fontSize: '13.5px',
          fontWeight: 500,
          cursor: 'pointer',
          marginBottom: '20px',
          padding: '4px 0',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = '#202124')}
        onMouseLeave={(e) => (e.currentTarget.style.color = '#5f6368')}
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
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
                  style={{ background: 'none', border: 'none', color: '#5f6368', cursor: 'pointer' }}
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
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8f9fa')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
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
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  borderRadius: '24px',
                  border: 'none',
                  backgroundColor: (selectedFile || hasSubmission) && !submitting ? '#1a73e8' : '#e8eaed',
                  color: (selectedFile || hasSubmission) && !submitting ? '#ffffff' : '#80868b',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: (selectedFile || hasSubmission) && !submitting ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s ease',
                }}
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
