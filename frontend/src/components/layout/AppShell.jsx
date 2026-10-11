import { useState, useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { Navbar } from './Navbar';
import { Sidebar } from './Sidebar';
import { useAuth } from '../../context/useAuth';

export const AppShell = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobileView(mobile);
      if (!mobile) {
        setIsMobileDrawerOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (isMobileView) {
      setIsMobileDrawerOpen((prev) => !prev);
    } else {
      setIsSidebarCollapsed((prev) => !prev);
    }
  };

  const showPasswordBanner = user?.role === 'student' && !!user.must_change_password;

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        maxWidth: '100vw',
        overflowX: 'hidden',
        backgroundColor: '#f3f3f3',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      <Navbar
        onToggleSidebar={handleToggleSidebar}
        isSidebarCollapsed={isSidebarCollapsed}
        isMobileView={isMobileView}
      />

      {/* Backdrop for mobile drawer */}
      {isMobileView && isMobileDrawerOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setIsMobileDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isCollapsed={isSidebarCollapsed}
        isMobileView={isMobileView}
        isMobileDrawerOpen={isMobileDrawerOpen}
        onCloseMobileDrawer={() => setIsMobileDrawerOpen(false)}
      />

      <main
        className={`app-main-content ${
          !isMobileView
            ? isSidebarCollapsed
              ? 'sidebar-collapsed'
              : 'sidebar-open'
            : ''
        }`}
      >
        {showPasswordBanner && (
          <div className="temporary-password-banner" role="alert">
            <div className="temporary-password-banner__message">
              <AlertTriangle size={20} aria-hidden="true" />
              <span>
                Your password is still temporary. Please change it to keep your account safe.
              </span>
            </div>
            <button
              type="button"
              className="temporary-password-banner__button"
              onClick={() => navigate('/student/settings', { state: { openChangePassword: true } })}
            >
              Change Password
            </button>
          </div>
        )}
        <Outlet />
      </main>
    </div>
  );
};

