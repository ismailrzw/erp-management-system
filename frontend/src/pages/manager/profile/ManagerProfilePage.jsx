import { useState, useEffect } from 'react';
import {
  User,
  Mail,
  Lock,
  Building2,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  KeyRound,
  Shield,
} from 'lucide-react';
import { authApi } from '../../../api/authApi';
import { useAuth } from '../../../context/useAuth';
import { Toast } from '../../../components/ui/Toast';
import { Preloader } from '../../../components/ui/Preloader';

export const ManagerProfilePage = () => {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

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
        const res = await authApi.getMe();
        if (isMounted && res.success && res.data) {
          setProfile(res.data);
        } else if (isMounted && user) {
          setProfile(user);
        }
      } catch (err) {
        if (isMounted) {
          // Fallback to auth context user
          if (user) {
            setProfile(user);
          } else {
            setToast({
              message: err.response?.data?.message || 'Failed to load manager profile',
              type: 'error',
            });
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

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
    if (new_password === current_password) {
      setPasswordError('New password must be different from your current password.');
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

      const res = await authApi.changePassword(current_password, new_password);

      if (res.success) {
        setPasswordSuccess('Password changed successfully! Keep your credentials secure.');
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setToast({ message: 'Password updated successfully!', type: 'success' });
      } else {
        setPasswordError(res.message || 'Failed to change password.');
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.message ||
        err.response?.data?.errors?.newPassword?.[0] ||
        err.response?.data?.errors?.currentPassword?.[0] ||
        err.message ||
        'Failed to change password';
      setPasswordError(errMsg);
    } finally {
      setSavingPassword(false);
    }
  };

  if (loading) {
    return <Preloader text="Loading Manager Profile..." />;
  }

  const managerData = profile || user || {};

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Toast Feedback */}
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
          Manager Profile & Security
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--body-text)' }}>
          View your administrative account credentials and update your portal password.
        </p>
      </div>

      {/* Profile Details Card */}
      <div
        className="card-responsive"
        style={{ borderTop: '3px solid var(--primary)', marginBottom: '22px' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingBottom: '14px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '18px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
                Account Information
              </h2>
              <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
                System Administrator & Coordinator Profile
              </div>
            </div>
          </div>

          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '12px',
              fontWeight: 600,
              padding: '4px 10px',
              borderRadius: '12px',
              backgroundColor: '#e0f2fe',
              color: '#0369a1',
              border: '1px solid #bae6fd',
            }}
          >
            <Shield size={13} />
            PBL Manager
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '16px',
          }}
        >
          {/* Full Name */}
          <div
            style={{
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              <User size={14} color="#0073aa" />
              <span>Full Name</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginTop: '6px' }}>
              {managerData.name || 'System Manager'}
            </div>
          </div>

          {/* Email Address */}
          <div
            style={{
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              <Mail size={14} color="#0073aa" />
              <span>Email Address</span>
            </div>
            <div style={{ fontSize: '14.5px', fontWeight: 600, color: '#1e293b', marginTop: '6px', wordBreak: 'break-all' }}>
              {managerData.email || 'zamanaziz@bnu.edu.pk'}
            </div>
          </div>

          {/* Department */}
          <div
            style={{
              padding: '14px',
              backgroundColor: '#f8fafc',
              borderRadius: '6px',
              border: '1px solid #e2e8f0',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11.5px',
                color: '#64748b',
                fontWeight: 600,
                textTransform: 'uppercase',
              }}
            >
              <Building2 size={14} color="#0073aa" />
              <span>Department</span>
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', marginTop: '6px' }}>
              {managerData.dept || 'Computer Science'}
            </div>
          </div>
        </div>
      </div>

      {/* Security & Password Change Card */}
      <div className="card-responsive" style={{ borderTop: '3px solid #f59e0b' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            paddingBottom: '14px',
            borderBottom: '1px solid #f1f5f9',
            marginBottom: '18px',
          }}
        >
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: '8px',
              backgroundColor: '#fef3c7',
              color: '#d97706',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <KeyRound size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--heading)' }}>
              Change Account Password
            </h2>
            <div style={{ fontSize: '12px', color: 'var(--muted)', marginTop: '2px' }}>
              Ensure your account uses a strong password with at least 6 characters.
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {passwordError && (
          <div
            style={{
              backgroundColor: '#fdecea',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              padding: '12px 14px',
              color: '#dc2626',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{passwordError}</span>
          </div>
        )}

        {/* Success Alert */}
        {passwordSuccess && (
          <div
            style={{
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '6px',
              padding: '12px 14px',
              color: '#15803d',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
            <span>{passwordSuccess}</span>
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Current Password */}
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
              Current Password <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={passwordForm.current_password}
                onChange={(e) =>
                  setPasswordForm((prev) => ({ ...prev, current_password: e.target.value }))
                }
                placeholder="Enter current password"
                required
                style={{
                  width: '100%',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '9px 12px 9px 36px',
                  fontSize: '13.5px',
                  color: '#1e293b',
                  outline: 'none',
                }}
              />
              <Lock
                size={16}
                style={{
                  position: 'absolute',
                  left: '11px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {/* New Password */}
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
                New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={passwordForm.new_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, new_password: e.target.value }))
                  }
                  placeholder="Min 6 characters"
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px 9px 36px',
                    fontSize: '13.5px',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
                <KeyRound
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
              </div>
            </div>

            {/* Confirm New Password */}
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
                Confirm New Password <span style={{ color: '#dc2626' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={passwordForm.confirm_password}
                  onChange={(e) =>
                    setPasswordForm((prev) => ({ ...prev, confirm_password: e.target.value }))
                  }
                  placeholder="Re-type new password"
                  required
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '6px',
                    padding: '9px 12px 9px 36px',
                    fontSize: '13.5px',
                    color: '#1e293b',
                    outline: 'none',
                  }}
                />
                <Lock
                  size={16}
                  style={{
                    position: 'absolute',
                    left: '11px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                  }}
                />
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
            <button
              type="submit"
              disabled={savingPassword}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 20px',
                backgroundColor: 'var(--primary)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '13.5px',
                fontWeight: 600,
                cursor: savingPassword ? 'not-allowed' : 'pointer',
                opacity: savingPassword ? 0.75 : 1,
                transition: 'background-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!savingPassword) e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
              }}
              onMouseLeave={(e) => {
                if (!savingPassword) e.currentTarget.style.backgroundColor = 'var(--primary)';
              }}
            >
              {savingPassword ? (
                <>
                  <Loader2 size={16} className="ball-scale-1" />
                  <span>Updating Password...</span>
                </>
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
