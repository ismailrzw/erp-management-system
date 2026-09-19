import { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { authApi } from '../../api/authApi';
import { Lock, CheckCircle2, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

export const SetPasswordPage = () => {
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tokenParam = params.get('token');
    if (!tokenParam) {
      setError('Activation token is missing or invalid. Please check the link from your email.');
    } else {
      setToken(tokenParam);
    }
  }, [location.search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Missing activation token. Please use the link sent to your university email.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    try {
      setIsSubmitting(true);
      await authApi.setPassword(token, password);
      setIsSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Failed to set password. Token may have expired.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #eef4f8 0%, #f3f3f3 60%)',
        padding: '20px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          width: '420px',
          maxWidth: '100%',
          borderRadius: '6px',
          borderTop: '4px solid #0073aa',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04)',
          padding: '36px 32px 28px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '10px',
            backgroundColor: '#0073aa',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '18px',
            margin: '0 auto 14px',
            boxShadow: '0 4px 6px -1px rgba(0, 115, 170, 0.3)',
          }}
        >
          PBL
        </div>

        <h2
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#4a6076',
            textAlign: 'center',
            margin: '0 0 6px',
          }}
        >
          {isSuccess ? 'Password Activated' : 'Set Your Password'}
        </h2>
        <div
          style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px',
            marginBottom: '22px',
          }}
        >
          {isSuccess
            ? 'Your account has been successfully activated.'
            : 'Enter your new password to complete account setup.'}
        </div>

        {error && (
          <div
            style={{
              backgroundColor: '#fdecea',
              color: '#dc2626',
              border: '1px solid #fecaca',
              padding: '10px 12px',
              borderRadius: '4px',
              fontSize: '13px',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {isSuccess ? (
          <div>
            <div
              style={{
                backgroundColor: '#ecfdf5',
                border: '1px solid #a7f3d0',
                color: '#065f46',
                padding: '16px',
                borderRadius: '6px',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                fontSize: '13.5px',
                lineHeight: 1.5,
              }}
            >
              <CheckCircle2 size={20} color="#059669" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Account setup complete!</strong>
                <p style={{ margin: '4px 0 0', color: '#047857', fontSize: '13px' }}>
                  You can now sign in using your student roll number (e.g. <code>f2023-551</code>) or your university email address.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate('/login')}
              style={{
                width: '100%',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '11px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
              }}
            >
              <span>Go to Sign In</span>
              <ArrowRight size={16} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '16px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  required
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '9px 12px 9px 36px',
                    color: '#1e293b',
                    fontSize: '14px',
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

            <div style={{ marginBottom: '22px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#334155',
                  marginBottom: '6px',
                }}
              >
                Confirm New Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  required
                  autoComplete="new-password"
                  style={{
                    width: '100%',
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    padding: '9px 12px 9px 36px',
                    color: '#1e293b',
                    fontSize: '14px',
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

            <button
              type="submit"
              disabled={isSubmitting || !token}
              style={{
                width: '100%',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                padding: '10px 18px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isSubmitting || !token ? 'not-allowed' : 'pointer',
                opacity: isSubmitting || !token ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s ease',
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="ball-scale-1" />
                  <span>Activating Account...</span>
                </>
              ) : (
                'Set Password & Activate'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <Link
                to="/login"
                style={{
                  fontSize: '13px',
                  color: '#0073aa',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Return to Sign In
              </Link>
            </div>
          </form>
        )}

        <div
          style={{
            textAlign: 'center',
            marginTop: '24px',
            color: '#94a3b8',
            fontSize: '11.5px',
            letterSpacing: '0.5px',
            fontWeight: 500,
          }}
        >
          BEACONHOUSE NATIONAL UNIVERSITY · PBL PORTAL
        </div>
      </div>
    </div>
  );
};
