import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/useAuth';
import { Mail, Lock, AlertCircle, Loader2 } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { role: 'PBL Manager', email: 'zamanaziz@bnu.edu.pk', pass: '11223344' },
  { role: 'Student — Ahmed Khan', email: 'BCSM-F16-327@SUPERIOR.EDU.PK', pass: 'pbl123*' },
  { role: 'Evaluator (Internal)', email: 'sarah.ahmed@superior.edu.pk', pass: 'pbl123*' },
  { role: 'Evaluator (External)', email: 'kashif.mehmood@techvista.com', pass: 'pbl123*' },
  { role: 'HOD', email: 'hod@superior.edu.pk', pass: 'pbl123*' },
  { role: 'DEAN', email: 'dean@superior.edu.pk', pass: 'pbl123*' },
];

export const SignInPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/manager/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    try {
      setIsSubmitting(true);
      const user = await login(email.trim(), password, rememberMe);
      
      if (user.role === 'pbl_manager') {
        navigate('/manager/dashboard', { replace: true });
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Invalid email or password. Please try again.';
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAutofill = (acc) => {
    setEmail(acc.email);
    setPassword(acc.pass);
    setError('');
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
          width: '400px',
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
          Sign In
        </h2>
        <div
          style={{
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px',
            marginBottom: '22px',
          }}
        >
          Project-Based Learning Management System
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
              Email Address
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. zamanaziz@bnu.edu.pk"
                autoComplete="username"
                required
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
              <Mail
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
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
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

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '20px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#475569', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                style={{ width: '15px', height: '15px' }}
              />
              Remember Me
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              width: '100%',
              backgroundColor: '#0073aa',
              color: '#ffffff',
              border: 'none',
              borderRadius: '4px',
              padding: '10px 18px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.75 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'background-color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#0095dd';
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) e.currentTarget.style.backgroundColor = '#0073aa';
            }}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="ball-scale-1" />
                <span>Signing In...</span>
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        <div
          style={{
            marginTop: '20px',
            backgroundColor: '#f8fafc',
            border: '1px dashed #cbd5e1',
            borderRadius: '4px',
            padding: '12px',
            fontSize: '12px',
            color: '#64748b',
          }}
        >
          <div style={{ fontWeight: 600, color: '#1e293b', marginBottom: '8px' }}>
            Demo Accounts (click to autofill)
          </div>
          {DEMO_ACCOUNTS.map((acc, idx) => (
            <div
              key={idx}
              onClick={() => handleAutofill(acc)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '2px 8px',
                padding: '5px 4px',
                borderRadius: '3px',
                cursor: 'pointer',
                transition: 'background-color 0.1s ease, color 0.1s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#eaf5fb';
                e.currentTarget.style.color = '#0073aa';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.color = '#64748b';
              }}
            >
              <span style={{ fontWeight: 500 }}>{acc.role}</span>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', wordBreak: 'break-all' }}>
                {acc.email}
              </span>
            </div>
          ))}
        </div>

        <div
          style={{
            textAlign: 'center',
            marginTop: '20px',
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
