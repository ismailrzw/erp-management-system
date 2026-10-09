import { BackButton } from '../../../components/ui/BackButton';
import { useState, useEffect } from 'react';
import {
  GraduationCap,
  AlertCircle,
  Loader2,
  KeyRound,
  Edit3,
} from 'lucide-react';
import { studentProfileApi } from '../../../api/studentProfileApi';
import { Toast } from '../../../components/ui/Toast';
import { ContentLoader } from '../../../components/ui/ContentLoader';
import { ChangePasswordModal } from '../../../components/profile/ChangePasswordModal';

export const StudentProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  // Modal State
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Profile Form States
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ recovery_email: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Notification Preferences (persisted in localStorage)
  const [notifications, setNotifications] = useState(() => {
    try {
      const saved = localStorage.getItem('pbl_student_notifications');
      return saved
        ? JSON.parse(saved)
        : {
            emailNotifications: true,
            deadlineReminders: true,
            groupAnnouncements: true,
            rubricFeedback: true,
          };
    } catch {
      return {
        emailNotifications: true,
        deadlineReminders: true,
        groupAnnouncements: true,
        rubricFeedback: true,
      };
    }
  });

  const toggleNotification = (key) => {
    setNotifications((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      try {
        localStorage.setItem('pbl_student_notifications', JSON.stringify(updated));
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
        const res = await studentProfileApi.getProfile();
        if (isMounted && res.success && res.data) {
          setProfile(res.data);
          setProfileForm({
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
    const recovery_email = profileForm.recovery_email.trim();

    try {
      setSavingProfile(true);
      setProfileError('');
      const res = await studentProfileApi.updateProfile({
        recovery_email: recovery_email || null,
      });

      if (res.success && res.data) {
        setProfile(res.data);
        setIsEditingProfile(false);
        setToast({ message: 'Profile details updated successfully!', type: 'success' });
      }
    } catch (err) {
      setProfileError(err.response?.data?.message || err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  if (loading) {
    return (
      <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <BackButton to="/student/dashboard" label="Back to Dashboard" />
        <ContentLoader label="Loading student settings..." />
      </div>
    );
  }

  const userInitial = profile?.name ? profile.name.charAt(0).toUpperCase() : 'S';

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <BackButton to="/student/dashboard" label="Back to Dashboard" />
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
          Manage your personal profile, security credentials, and portal notification preferences.
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
                  {profile?.name}
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
                  Student
                </span>
              </div>
              <div style={{ fontSize: '13px', color: '#64748b', marginTop: '3px' }}>
                Roll Number: <b>{profile?.roll}</b> • {profile?.dept} (Section {profile?.section})
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsEditingProfile(!isEditingProfile)}
            className="btn btn-secondary"
          >
            <Edit3 size={14} />
            <span>{isEditingProfile ? 'Cancel Edit' : 'Edit Profile Details'}</span>
          </button>
        </div>

        {/* Inline Profile Edit Form (when expanded) */}
        {isEditingProfile && (
          <form
            onSubmit={handleProfileSubmit}
            style={{
              marginTop: '18px',
              padding: '20px',
              backgroundColor: '#f8fafc',
              borderRadius: '8px',
              border: '1px solid #e2e8f0',
            }}
          >
            <h4 style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              Update Profile Details
            </h4>

            {profileError && (
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#fee2e2',
                  border: '1px solid #fecaca',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  color: '#b91c1c',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <AlertCircle size={15} />
                <span>{profileError}</span>
              </div>
            )}

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: '#334155', marginBottom: '4px' }}>
                Recovery / Personal Email
              </label>
              <input
                type="email"
                value={profileForm.recovery_email}
                placeholder="personal.email@example.com"
                onChange={(e) => setProfileForm({ ...profileForm, recovery_email: e.target.value })}
                style={{
                  width: '100%',
                  padding: '9px 12px',
                  borderRadius: '6px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                }}
                disabled={savingProfile}
              />
              <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '4px' }}>
                Used for account recovery, notifications, and reset communications.
              </div>
            </div>

            {/* Change Password Option within Edit Profile Details */}
            <div
              style={{
                marginTop: '14px',
                paddingTop: '14px',
                borderTop: '1px solid #e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  Account Password
                </div>
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                  Update your security credentials to protect your student portal account.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasswordModalOpen(true)}
                className="btn btn-secondary btn-sm"
              >
                <KeyRound size={14} />
                <span>Change Password</span>
              </button>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
              <button
                type="button"
                onClick={() => setIsEditingProfile(false)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingProfile}
              >
                {savingProfile && <Loader2 size={14} className="animate-spin" />}
                <span>{savingProfile ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Academic Enrollment Details Grid */}
        <div style={{ marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
            <GraduationCap size={16} color="var(--primary)" />
            <h4 style={{ margin: 0, fontSize: '13.5px', fontWeight: 600, color: 'var(--heading)' }}>
              Academic Enrollment Details
            </h4>
          </div>

          <div className="form-grid-3">
            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                University Email
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px', wordBreak: 'break-all' }}>
                {profile?.email}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Department & Section
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                {profile?.dept} — Section {profile?.section}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Enrolled Course
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                {profile?.course}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Project Supervisor / Evaluator
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                {profile?.supervisor_name || 'Not Assigned (Group-based)'}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Academic Session
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px' }}>
                {profile?.session || 'Current'}
              </div>
            </div>

            <div style={{ padding: '12px', backgroundColor: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '11px', color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                Recovery Email
              </div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', marginTop: '3px', wordBreak: 'break-all' }}>
                {profile?.recovery_email || 'Not configured'}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            These settings apply to the notifications and updates you receive.
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
                Receive essential project milestone and portal updates via email.
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

          {/* Deadline Reminders */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                Milestone deadlines & submission reminders
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Get notified 24 hours and 2 hours before upcoming iteration deadlines.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('deadlineReminders')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.deadlineReminders ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle deadline reminders"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.deadlineReminders ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Group Announcements */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                Project group comments & invitations
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Alerts when teammates send join requests or invitation notices.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('groupAnnouncements')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.groupAnnouncements ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle group announcements"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.groupAnnouncements ? 'translateX(20px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                }}
              />
            </button>
          </div>

          {/* Rubric Feedback */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', paddingTop: '14px', borderTop: '1px solid #f8fafc' }}>
            <div>
              <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#1e293b' }}>
                Evaluation scores & rubric feedback
              </div>
              <div style={{ fontSize: '12.5px', color: '#64748b', marginTop: '2px' }}>
                Instant notification as soon as an evaluator grades your submission.
              </div>
            </div>
            <button
              type="button"
              onClick={() => toggleNotification('rubricFeedback')}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                backgroundColor: notifications.rubricFeedback ? 'var(--primary, #0073aa)' : '#cbd5e1',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background-color 0.2s ease',
                padding: '2px',
                flexShrink: 0,
              }}
              aria-label="Toggle rubric feedback"
            >
              <div
                style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  backgroundColor: '#ffffff',
                  transform: notifications.rubricFeedback ? 'translateX(20px)' : 'translateX(0)',
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
