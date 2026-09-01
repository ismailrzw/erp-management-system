import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Building2,
  BookOpen,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';
import { studentProfileApi } from '../../../api/studentProfileApi';
import { useAuth } from '../../../context/useAuth';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';

export const StudentProfilePage = () => {
  const { updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Profile Form States
  const [profileForm, setProfileForm] = useState({ name: '', recovery_email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Password Form States
  const [passwordForm, setPasswordForm] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await studentProfileApi.getProfile();
        if (isMounted && res.success && res.data) {
          setProfile(res.data);
          setProfileForm({
            name: res.data.name || '',
            recovery_email: res.data.recovery_email || '',
          });
        }
      } catch (err) {
        if (isMounted) {
          setToast({
            message: err.response?.data?.message || 'Failed to load profile',
            type: 'error',
          });
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    const name = profileForm.name.trim();
    const recovery_email = profileForm.recovery_email.trim();

    if (!name) {
      setProfileError('Full Name is required.');
      return;
    }

    try {
      setSavingProfile(true);
      setProfileError('');
      const res = await studentProfileApi.updateProfile({
        name,
        recovery_email: recovery_email || null,
      });

      if (res.success && res.data) {
        setProfile(res.data);
        updateUser({ name: res.data.name });
        setToast({ message: 'Profile updated successfully!', type: 'success' });
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    const { current_password, new_password, confirm_password } = passwordForm;

    if (!current_password) {
      setPasswordError('Current Password is required.');
      return;
    }
    if (!new_password || new_password.length < 6) {
      setPasswordError('New Password must be at least 6 characters.');
      return;
    }
    if (new_password !== confirm_password) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }

    try {
      setSavingPassword(true);
      setPasswordError('');
      setPasswordSuccess('');
      const res = await studentProfileApi.changePassword(
        current_password,
        new_password,
        confirm_password
      );

      if (res.success) {
        setPasswordSuccess('Password changed successfully! Keep your new credentials secure.');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setToast({ message: 'Password updated successfully!', type: 'success' });
      }
    } catch (err) {
      setPasswordError(err.response?.data?.message || err.message || 'Failed to change password');
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <Preloader text="Loading Student Profile..." />;
  }

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Toast */}
      {toast.message && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast({ message: '', type: 'success' })}
        />
      )}

      {/* Header */}
      <div style={{ marginBottom: '22px' }}>
        <h1 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: 'var(--heading)' }}>
          Profile & Security Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--body-text)' }}>
          Manage your personal account details and update your login password.
        </p>
      </div>

      {/* Academic Information Card (Read-Only) */}
      <div className="card-responsive" style={{ borderTop: '3px solid var(--primary)', marginBottom: '22px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            paddingBottom: '12px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '16px',
          }}
        >
          <GraduationCap size={18} color="var(--primary)" />
          <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
            Academic Enrollment Information
          </h2>
        </div>

        <div className="form-grid-3">
          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Roll Number
            </div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#0f172a', marginTop: '3px' }}>
              {profile?.roll}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              University Login Email
            </div>
            <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginTop: '3px', wordBreak: 'break-all' }}>
              {profile?.email}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Department & Section
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
              {profile?.dept} — Section {profile?.section}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Enrolled Course
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
              {profile?.course}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Assigned Teacher / Evaluator
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
              {profile?.teacher || 'Not Assigned'}
            </div>
          </div>

          <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '11.5px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
              Academic Session
            </div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
              {profile?.session || 'Current'}
            </div>
          </div>
        </div>
      </div>

      {/* Dual Column: Edit Profile + Change Password */}
      <div className="dashboard-dual-grid">
        {/* Left Form: Edit Profile Details */}
        <div className="card-responsive" style={{ borderTop: '3px solid var(--info)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
            }}
          >
            <User size={18} color="var(--info)" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
              Edit Personal Information
            </h2>
          </div>

          {profileError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '14px',
              }}
            >
              <AlertCircle size={16} />
              <span>{profileError}</span>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                htmlFor="student_name"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
              >
                Full Name <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="student_name"
                type="text"
                value={profileForm.name}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, name: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label
                htmlFor="recovery_email"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
              >
                Recovery / Personal Email
              </label>
              <input
                id="recovery_email"
                type="email"
                placeholder="e.g. personal@gmail.com"
                value={profileForm.recovery_email}
                onChange={(e) => setProfileForm((prev) => ({ ...prev, recovery_email: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
              />
              <div style={{ fontSize: '11.5px', color: 'var(--muted)', marginTop: '4px' }}>
                Optional secondary email for notifications and account recovery.
              </div>
            </div>

            <div style={{ paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={savingProfile}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: 'var(--primary)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingProfile ? 'not-allowed' : 'pointer',
                }}
              >
                {savingProfile && <Loader2 size={15} className="animate-spin" />}
                <span>{savingProfile ? 'Saving...' : 'Save Profile'}</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Form: Change Password */}
        <div className="card-responsive" style={{ borderTop: '3px solid var(--warning)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              paddingBottom: '12px',
              borderBottom: '1px solid #f1f5f9',
              marginBottom: '16px',
            }}
          >
            <KeyRound size={18} color="#ca8a04" />
            <h2 style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: 'var(--heading)' }}>
              Change Account Password
            </h2>
          </div>

          {passwordError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                backgroundColor: 'var(--danger-light)',
                border: '1px solid #fecaca',
                borderRadius: '6px',
                color: '#b91c1c',
                fontSize: '13px',
                marginBottom: '14px',
              }}
            >
              <AlertCircle size={16} />
              <span>{passwordError}</span>
            </div>
          )}

          {passwordSuccess && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 12px',
                backgroundColor: 'var(--success-light)',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                color: '#15803d',
                fontSize: '13px',
                marginBottom: '14px',
              }}
            >
              <CheckCircle2 size={16} />
              <span>{passwordSuccess}</span>
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <label
                htmlFor="current_password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
              >
                Current Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="current_password"
                type="password"
                placeholder="Enter current password"
                value={passwordForm.current_password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div>
              <label
                htmlFor="new_password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
              >
                New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="new_password"
                type="password"
                placeholder="At least 6 characters"
                value={passwordForm.new_password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                minLength={6}
                required
              />
            </div>

            <div>
              <label
                htmlFor="confirm_password"
                style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '5px' }}
              >
                Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <input
                id="confirm_password"
                type="password"
                placeholder="Re-type new password"
                value={passwordForm.confirm_password}
                onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  fontSize: '13.5px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  outline: 'none',
                }}
                required
              />
            </div>

            <div style={{ paddingTop: '10px' }}>
              <button
                type="submit"
                disabled={savingPassword}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '9px 18px',
                  backgroundColor: '#334155',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: savingPassword ? 'not-allowed' : 'pointer',
                }}
              >
                {savingPassword && <Loader2 size={15} className="animate-spin" />}
                <span>{savingPassword ? 'Updating Password...' : 'Update Password'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
