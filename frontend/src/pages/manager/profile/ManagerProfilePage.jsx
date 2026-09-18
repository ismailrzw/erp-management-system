import { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  KeyRound,
  GraduationCap,
  Plus,
  X,
  Loader2,
  Save,
} from 'lucide-react';
import { authApi } from '../../../api/authApi';
import { supervisorsApi } from '../../../api/supervisorsApi';
import { useAuth } from '../../../context/useAuth';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { ChangePasswordModal } from '../../../components/profile/ChangePasswordModal';

export const ManagerProfilePage = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Evaluator Domain Tags
  const [domains, setDomains] = useState([]);
  const [domainInput, setDomainInput] = useState('');
  const [savingDomains, setSavingDomains] = useState(false);

  // Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Notification Preferences (persisted in localStorage)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('pbl_manager_notifications');
      return saved
        ? JSON.parse(saved)
        : {
            emailNotifications: true,
            groupRequests: true,
            submissionAlerts: true,
            systemNotices: true,
          };
    } catch {
      return {
        emailNotifications: true,
        groupRequests: true,
        submissionAlerts: true,
        systemNotices: true,
      };
    }
  });

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('pbl_manager_notifications', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  useEffect(() => {
    let isMounted = true;
    const fetchProfile = async () => {
      try {
        const res = await authApi.getMe();
        if (isMounted && res.success && res.data) {
          setProfile(res.data);
          setDomains(res.data.domains || []);
        } else if (isMounted && user) {
          setProfile(user);
          setDomains(user.domains || []);
        }
      } catch (err) {
        if (isMounted) {
          if (user) {
            setProfile(user);
            setDomains(user.domains || []);
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

  const handleAddDomain = () => {
    const val = domainInput.trim();
    if (!val) return;
    if (domains.includes(val)) {
      setToast({ message: 'Domain tag already added.', type: 'info' });
      return;
    }
    setDomains([...domains, val]);
    setDomainInput('');
  };

  const handleRemoveDomain = (idx) => {
    setDomains(domains.filter((_, i) => i !== idx));
  };

  const handleSaveDomains = async () => {
    try {
      setSavingDomains(true);
      const res = await supervisorsApi.updateEvaluatorDomains(domains);
      if (res.success) {
        setToast({ message: 'Supervision & research domains updated successfully!', type: 'success' });
      }
    } catch (err) {
      setToast({
        message: err.response?.data?.message || 'Failed to update domains.',
        type: 'error',
      });
    } finally {
      setSavingDomains(false);
    }
  };

  const managerData = profile || user || {};

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <ContentLoader label="Loading settings..." />
      </div>
    );
  }

  const userInitial = managerData?.name ? managerData.name.charAt(0).toUpperCase() : 'M';
  const roleLabel =
    managerData?.role === 'pbl_manager'
      ? 'PBL Manager'
      : managerData?.role === 'evaluator'
      ? 'Evaluator'
      : managerData?.role || 'Administrator';

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

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSuccess={(msg) => setToast({ message: msg, type: 'success' })}
      />

      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--heading)' }}>
          Settings
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '13.5px', color: 'var(--body-text)' }}>
          View administrative account credentials, update login security, and configure portal notifications.
        </p>
      </div>

      {/* CARD 1: PROFILE & ACCOUNT SECURITY (Google Classroom Style) */}
      <div
        className="card-responsive"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--heading)' }}>
            Profile
          </h2>
        </div>

        {/* Profile Avatar & Info Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            paddingBottom: '20px',
            borderBottom: '1px solid #f8fafc',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                backgroundColor: 'var(--primary, #0073aa)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '22px',
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: '0 2px 6px rgba(0, 115, 170, 0.25)',
              }}
            >
              {userInitial}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#0f172a' }}>
                  {managerData?.name || 'Administrator'}
                </h3>
                <span
                  style={{
                    backgroundColor: '#eaf5fb',
                    color: '#0073aa',
                    fontSize: '11px',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: '12px',
                    textTransform: 'uppercase',
                  }}
                >
                  {roleLabel}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                {managerData?.email}
              </div>
            </div>
          </div>
        </div>

        {/* Account Settings / Password Row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            padding: '18px 0',
            borderBottom: '1px solid #f1f5f9',
          }}
        >
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Account security
            </div>
            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
              Change your password and security credentials to protect your portal account.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPasswordModalOpen(true)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              fontSize: '13px',
              fontWeight: 600,
              color: 'var(--primary, #0073aa)',
              backgroundColor: '#eaf5fb',
              border: '1px solid #bae6fd',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#dbeafe')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#eaf5fb')}
          >
            <KeyRound size={15} />
            <span>Change Password</span>
          </button>
        </div>

        {/* Account Credentials Grid */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <ShieldCheck size={16} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--heading)' }}>
              Administrative Credentials & Role Details
            </h4>
          </div>

          <div className="form-grid-3">
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Full Name
              </div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                {managerData?.name || 'System Manager'}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Official Login Email
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px', wordBreak: 'break-all' }}>
                {managerData?.email}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Assigned Role
              </div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                {roleLabel}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Account Security Status
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#15803d', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} />
                <span>Active & Verified</span>
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Access Permissions
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                Full Portal Management
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Two-Factor Security
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#64748b', marginTop: '3px' }}>
                Password Protected
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CARD: EVALUATOR RESEARCH & SUPERVISION DOMAINS (Only for Evaluators) */}
      {managerData?.role === 'evaluator' && (
        <div
          className="card-responsive"
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
          }}
        >
          <div style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <GraduationCap size={20} color="#7c3aed" />
              <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--heading)' }}>
                Research & Supervision Domains
              </h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--body-text)' }}>
              Specify your areas of expertise so students can discover and request your supervision for relevant projects.
            </p>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
              Domain Tags & Specialties
            </label>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              <input
                type="text"
                placeholder="e.g. Machine Learning, Cloud Computing, Mobile Apps, IoT..."
                value={domainInput}
                onChange={(e) => setDomainInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
                style={{
                  flex: '1 1 240px',
                  padding: '8px 12px',
                  fontSize: '13px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={handleAddDomain}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#334155',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e2e8f0')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
              >
                <Plus size={15} />
                <span>Add Tag</span>
              </button>
            </div>

            {/* Tags display */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', minHeight: '36px', marginBottom: '18px' }}>
              {domains.length === 0 ? (
                <span style={{ fontSize: '13px', color: '#94a3b8', fontStyle: 'italic' }}>
                  No domain tags added yet. Add domain tags above to help students find you.
                </span>
              ) : (
                domains.map((dom, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '4px 10px',
                      fontSize: '12.5px',
                      fontWeight: 600,
                      backgroundColor: '#f5f3ff',
                      color: '#7c3aed',
                      border: '1px solid #ddd6fe',
                      borderRadius: '16px',
                    }}
                  >
                    <span>{dom}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDomain(idx)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        cursor: 'pointer',
                        color: '#a78bfa',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = '#a78bfa')}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
              <button
                type="button"
                onClick={handleSaveDomains}
                disabled={savingDomains}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  backgroundColor: '#7c3aed',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: savingDomains ? 'not-allowed' : 'pointer',
                }}
              >
                {savingDomains ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                <span>{savingDomains ? 'Saving...' : 'Save Domains'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CARD 2: NOTIFICATIONS (Google Classroom Style) */}
      <div
        className="card-responsive"
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          padding: '24px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
        }}
      >
        <div style={{ paddingBottom: '16px', borderBottom: '1px solid #f1f5f9', marginBottom: '20px' }}>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--heading)' }}>
            Notifications
          </h2>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--body-text)' }}>
            These settings apply to the administrative alerts and notices you receive.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Allow email notifications */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                Allow email notifications
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Receive essential administrative summaries and portal alerts via email.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('emailNotifications')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.emailNotifications ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle email notifications"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.emailNotifications ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Group Requests */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                Student group creations & supervisor requests
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Alerts when new project groups are formed and pending coordinator approval.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('groupRequests')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.groupRequests ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle group requests"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.groupRequests ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Submission Alerts */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                Milestone submissions & rubric grading updates
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Notifications when student groups turn in milestone iterations.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('submissionAlerts')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.submissionAlerts ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle submission alerts"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.submissionAlerts ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* System Notices */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                System security & coordinator digests
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Weekly digest reports on department milestones and evaluator progress.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('systemNotices')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.systemNotices ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle system notices"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.systemNotices ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
