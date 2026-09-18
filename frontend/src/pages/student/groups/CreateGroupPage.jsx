import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusCircle,
  ArrowLeft,
  Info,
  AlertCircle,
  Loader2,
  FileText,
  UploadCloud,
  CheckCircle2,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { studentDashboardApi } from '../../../api/studentDashboardApi';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';

export const CreateGroupPage = () => {
  const [projectTitle, setProjectTitle] = useState('');
  const [proposalFile, setProposalFile] = useState(null);
  const [existingGroup, setExistingGroup] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [createdGroup, setCreatedGroup] = useState(null);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    const checkState = async () => {
      try {
        const res = await studentDashboardApi.getDashboard();
        if (isMounted && res.success && res.data) {
          setStudentInfo(res.data.student);
          if (res.data.group) {
            setExistingGroup(res.data.group);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data?.message || 'Failed to verify student group status');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    checkState();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const cleanTitle = projectTitle.trim();

    if (!cleanTitle) {
      setError('Please enter a project title / idea.');
      return;
    }
    if (cleanTitle.length < 3) {
      setError('Project title must be at least 3 characters.');
      return;
    }
    if (!proposalFile) {
      setError('A Project Proposal document (PDF or Word, max 10MB) is required.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const formData = new FormData();
      formData.append('project_title', cleanTitle);
      formData.append('proposal', proposalFile);

      const res = await studentGroupApi.createGroup(formData);
      if (res.success && res.data) {
        setCreatedGroup(res.data);
        setToast({ message: `Group '${res.data.name}' created successfully!`, type: 'success' });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <ContentLoader label="Checking group eligibility..." />
      </div>
    );
  }

  if (existingGroup) {
    return (
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <div className="card-responsive" style={{ borderTop: '3px solid var(--warning)', textAlign: 'center', padding: '36px 20px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              backgroundColor: '#fef9c3',
              color: '#ca8a04',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={32} />
          </div>
          <h2 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: 700, color: 'var(--heading)' }}>
            You are already in a Project Group
          </h2>
          <p style={{ margin: '0 0 20px', fontSize: '13.5px', color: 'var(--body-text)', maxWidth: '480px', marginInline: 'auto' }}>
            You are currently a member of <b>{existingGroup.name}</b>. Per university policy, each student may only belong to one group at a time.
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => navigate('/student/group/my')}
              style={{
                padding: '9px 18px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to My Group
            </button>
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              style={{
                padding: '9px 18px',
                backgroundColor: '#ffffff',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (createdGroup) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto' }}>
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            border: '1px solid #e2e8f0',
            padding: '36px 28px',
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
          }}
        >
          <CheckCircle2 size={52} color="#16a34a" style={{ margin: '0 auto 14px' }} />
          <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px' }}>
            Project Group Registered!
          </h2>
          <p style={{ color: '#64748b', fontSize: '14px', marginBottom: '24px' }}>
            Your group has been registered with auto-assigned identifier:
          </p>

          <div
            style={{
              display: 'inline-block',
              backgroundColor: '#eff6ff',
              border: '2px dashed #93c5fd',
              borderRadius: '8px',
              padding: '12px 28px',
              marginBottom: '20px',
            }}
          >
            <div style={{ fontSize: '24px', fontWeight: 800, color: '#0073aa', letterSpacing: '1px' }}>
              {createdGroup.name}
            </div>
            <div style={{ fontSize: '13px', color: '#475569', marginTop: '4px' }}>
              {createdGroup.project_title}
            </div>
          </div>

          <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '28px' }}>
            You can now browse and request supervisors, and invite peers from your section to join your team.
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
            <button
              type="button"
              onClick={() => navigate('/student/group/my')}
              style={{
                padding: '10px 22px',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Go to Group Management
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '780px', margin: '0 auto' }}>
      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Back Button & Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button
          type="button"
          onClick={() => navigate('/student/dashboard')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '36px',
            height: '36px',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            color: '#475569',
            cursor: 'pointer',
          }}
          title="Back to Dashboard"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--heading)' }}>
            Create Project Group
          </h1>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--muted)' }}>
            Enter your project proposal details to generate your official FYP group.
          </p>
        </div>
      </div>

      {/* Info Card */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px',
          padding: '14px 16px',
          backgroundColor: '#eff6ff',
          border: '1px solid #bfdbfe',
          borderRadius: '8px',
          marginBottom: '20px',
          fontSize: '13px',
          color: '#1e40af',
          lineHeight: '1.5',
        }}
      >
        <Info size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
        <div>
          <div>
            You are creating a group for <b>{studentInfo?.course || 'Course'}</b> (Department of <b>{studentInfo?.dept}</b>, Section <b>{studentInfo?.section}</b>).
          </div>
          <div style={{ marginTop: '4px', fontSize: '12px', color: '#3b82f6' }}>
            The system will <strong>automatically generate your Group Name</strong> (e.g. <code>GRP-2026-001</code>) and record your creation status against the course deadline.
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="card-responsive" style={{ borderTop: '3px solid var(--primary)' }}>
        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 14px',
              backgroundColor: 'var(--danger-light)',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              color: '#b91c1c',
              fontSize: '13px',
              marginBottom: '18px',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label
              htmlFor="project_title"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Project Title / Idea <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="project_title"
              name="project_title"
              type="text"
              placeholder="e.g. AI-Powered Smart Attendance and Surveillance System"
              value={projectTitle}
              onChange={(e) => { setProjectTitle(e.target.value); setError(''); }}
              disabled={submitting}
              maxLength={150}
              required
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: '13.5px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1',
                outline: 'none',
                backgroundColor: '#ffffff',
              }}
            />
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
              A concise descriptive title for your final year project.
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Attach Project Proposal Document <span style={{ color: '#dc2626' }}>*</span>
            </label>

            <div
              style={{
                border: '2px dashed #cbd5e1',
                borderRadius: '8px',
                padding: '24px 20px',
                textAlign: 'center',
                backgroundColor: '#f8fafc',
                cursor: 'pointer',
              }}
              onClick={() => document.getElementById('proposal_upload')?.click()}
            >
              <input
                id="proposal_upload"
                type="file"
                accept=".pdf,.docx,.doc"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setProposalFile(file);
                  setError('');
                }}
              />
              {proposalFile ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <FileText size={24} color="#0073aa" />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                      {proposalFile.name}
                    </div>
                    <div style={{ fontSize: '11.5px', color: '#64748b' }}>
                      {(proposalFile.size / 1024 / 1024).toFixed(2)} MB • Click to replace file
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud size={32} color="#94a3b8" style={{ margin: '0 auto 8px' }} />
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#334155' }}>
                    Click to upload Project Proposal (PDF or Word)
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                    Supported formats: .pdf, .docx (Max 10 MB)
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid #f1f5f9',
            }}
          >
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              disabled={submitting}
              style={{
                padding: '9px 16px',
                backgroundColor: '#ffffff',
                color: '#475569',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: submitting ? 'not-allowed' : 'pointer',
              }}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Submitting Proposal & Creating Group...</span>
                </>
              ) : (
                <>
                  <PlusCircle size={16} />
                  <span>Create Project Group</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
