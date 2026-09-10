import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/ui/PageHeader';
import { Preloader } from '../../../components/ui/Preloader';
import { Toast } from '../../../components/ui/Toast';
import { DeadlineCountdown } from '../../../components/ui/DeadlineCountdown';
import { FileDropzone } from '../../../components/ui/FileDropzone';
import { studentIterationsApi } from '../../../api/studentIterationsApi';
import { ArrowLeft, Calendar, FileText, Upload, CheckCircle2, Clock, AlertTriangle, Download } from 'lucide-react';

export const IterationDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [iteration, setIteration] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  const fetchDetail = async () => {
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
  };

  useEffect(() => {
    fetchDetail();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setToast({ type: 'error', message: 'Please select a file to submit.' });
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      if (note.trim()) {
        formData.append('note', note.trim());
      }

      const res = await studentIterationsApi.submit(id, formData);
      setToast({ type: 'success', message: res.message || 'Submission uploaded successfully.' });
      setSelectedFile(null);
      fetchDetail();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to submit file.';
      setToast({ type: 'error', message: msg });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Preloader label="Loading iteration details..." />;
  if (!iteration) return null;

  const hasSubmission = iteration.has_submitted;
  const submission = iteration.submission;
  const rubrics = iteration.rubrics || [];

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <button
        type="button"
        onClick={() => navigate('/student/iterations')}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: 'none',
          border: 'none',
          color: '#64748b',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          marginBottom: '16px',
        }}
      >
        <ArrowLeft size={16} />
        Back to Iterations
      </button>

      {/* Header Info Banner */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              {iteration.title}
            </h1>
            <p style={{ margin: 0, fontSize: '13.5px', color: '#64748b' }}>
              Course: <strong style={{ color: '#334155' }}>{iteration.course}</strong>
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#334155' }}>
              <Calendar size={15} style={{ color: '#64748b' }} />
              <span>Deadline: <strong>{iteration.deadline}</strong></span>
            </div>
            <DeadlineCountdown deadline={iteration.deadline} />
          </div>
        </div>

        {iteration.details && (
          <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid #f1f5f9', fontSize: '13.5px', color: '#334155', lineHeight: 1.5 }}>
            {iteration.details}
          </div>
        )}
      </div>

      {/* Grid: Left Column Rubrics, Right Column Submission */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
        {/* Rubrics Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <FileText size={18} style={{ color: '#2563eb' }} />
            Evaluation Rubric ({rubrics.length} Criteria)
          </h2>

          {rubrics.length === 0 ? (
            <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>No rubric criteria attached by the manager yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {rubrics.map((r, idx) => (
                <div key={idx} style={{ border: '1px solid #f1f5f9', backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                      {idx + 1}. {r.question}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#1d4ed8', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '12px', border: '1px solid #bfdbfe' }}>
                      Weight: {r.weight}%
                    </span>
                  </div>

                  {r.levels && (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '6px', marginTop: '10px' }}>
                      {Object.entries(r.levels).map(([lvl, desc]) => (
                        <div key={lvl} style={{ backgroundColor: '#ffffff', padding: '6px 8px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: '#475569' }}>Level {lvl}</span>
                          <p style={{ margin: '2px 0 0', fontSize: '11.5px', color: '#64748b', lineHeight: 1.3 }}>
                            {desc || '—'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submission Upload Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '20px 24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <h2 style={{ margin: '0 0 14px', fontSize: '16px', fontWeight: 600, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} style={{ color: '#2563eb' }} />
            Project File Submission
          </h2>

          {/* Previous Submission Status */}
          {hasSubmission && submission && (
            <div
              style={{
                backgroundColor: submission.is_late ? '#fffbeb' : '#f0fdf4',
                border: `1px solid ${submission.is_late ? '#fde68a' : '#bbf7d0'}`,
                borderRadius: '8px',
                padding: '14px 16px',
                marginBottom: '20px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {submission.is_late ? (
                    <Clock size={18} style={{ color: '#d97706' }} />
                  ) : (
                    <CheckCircle2 size={18} style={{ color: '#16a34a' }} />
                  )}
                  <span style={{ fontSize: '13.5px', fontWeight: 600, color: submission.is_late ? '#b45309' : '#15803d' }}>
                    {submission.is_late ? 'Submitted (LATE)' : 'Submitted On-Time'}
                  </span>
                </div>
                {submission.submitted_at && (
                  <span style={{ fontSize: '12px', color: '#64748b' }}>
                    Submitted: {new Date(submission.submitted_at).toLocaleString()}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  📄 {submission.file_name}
                </span>
                {submission.file_url && (
                  <a
                    href={submission.file_url}
                    target="_blank"
                    rel="noreferrer"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: '#2563eb', fontWeight: 600, textDecoration: 'none' }}
                  >
                    <Download size={14} />
                    Download File
                  </a>
                )}
              </div>
              {submission.note && (
                <p style={{ margin: '8px 0 0', fontSize: '12.5px', color: '#475569' }}>
                  <strong>Note:</strong> {submission.note}
                </p>
              )}
            </div>
          )}

          {/* Submission Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {hasSubmission ? 'Upload Replacement File' : 'Upload Deliverable File'}
              </label>
              <FileDropzone
                onFileSelect={(file) => setSelectedFile(file)}
                selectedFile={selectedFile}
                onFileRemove={() => setSelectedFile(null)}
                disabled={submitting}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Submission Notes (Optional)
              </label>
              <textarea
                rows={3}
                placeholder="Add any notes for the evaluator regarding this submission..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '13px', resize: 'vertical' }}
                disabled={submitting}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={submitting || !selectedFile}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: selectedFile && !submitting ? '#2563eb' : '#94a3b8',
                  color: '#ffffff',
                  fontSize: '13.5px',
                  fontWeight: 600,
                  cursor: selectedFile && !submitting ? 'pointer' : 'not-allowed',
                }}
              >
                <Upload size={16} />
                {submitting ? 'Uploading...' : hasSubmission ? 'Re-Submit File' : 'Submit Work'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
