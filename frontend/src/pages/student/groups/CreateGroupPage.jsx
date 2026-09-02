import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  PlusCircle,
  ArrowLeft,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { studentGroupApi } from '../../../api/studentGroupApi';
import { studentDashboardApi } from '../../../api/studentDashboardApi';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';

export const CreateGroupPage = () => {
  const [formData, setFormData] = useState({ name: '', project_title: '' });
  const [existingGroup, setExistingGroup] = useState(null);
  const [studentInfo, setStudentInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const name = formData.name.trim();
    const project_title = formData.project_title.trim();

    if (!name) {
      setError('Please enter a group name.');
      return;
    }
    if (name.length < 2) {
      setError('Group name must be at least 2 characters.');
      return;
    }
    if (!project_title) {
      setError('Please enter a project title.');
      return;
    }
    if (project_title.length < 3) {
      setError('Project title must be at least 3 characters.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      const res = await studentGroupApi.createGroup({ name, project_title });
      if (res.success) {
        setToast({ message: 'Project group created successfully!', type: 'success' });
        setTimeout(() => {
          navigate('/student/group/my');
        }, 800);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create group');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <Preloader text="Checking group eligibility..." />;
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
            Register your group and start inviting section peers as team members.
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
            As group creator, you will be assigned as <b>Group Leader</b> with permission to invite peers, manage members, and submit project work.
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div>
            <label
              htmlFor="name"
              style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: 600,
                color: '#334155',
                marginBottom: '6px',
              }}
            >
              Group Name <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. CodeCraft Innovators, Team Alpha"
              value={formData.name}
              onChange={handleChange}
              disabled={submitting}
              maxLength={50}
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
              Between 2 and 50 characters.
            </div>
          </div>

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
              value={formData.project_title}
              onChange={handleChange}
              disabled={submitting}
              maxLength={120}
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
              Between 3 and 120 characters. Can be updated later by the leader.
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
                  <span>Creating Group...</span>
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
