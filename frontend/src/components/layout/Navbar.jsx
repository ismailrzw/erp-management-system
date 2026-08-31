import { useState, useRef, useEffect } from 'react';
import { Menu, Bell, ChevronDown, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/useAuth';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ onToggleSidebar, isSidebarCollapsed, isMobileView }) => {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleLabel = (role) => {
    const labels = {
      pbl_manager: 'PBL Manager',
      student: 'Student',
      evaluator: 'Evaluator',
      hod: 'HOD',
      hodic: 'HOD I&C',
      dean: 'DEAN',
    };
    return labels[role] || role || 'User';
  };

  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: isMobileView ? '0 12px' : '0 20px',
        zIndex: 500,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '8px' : '14px' }}>
        {/* Desktop Brand Column */}
        {!isMobileView && (
          <div
            style={{
              width: isSidebarCollapsed ? '64px' : '235px',
              marginLeft: '-20px',
              paddingLeft: '18px',
              height: '60px',
              backgroundColor: '#1f2d3a',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              transition: 'width 0.2s ease',
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: '#0073aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
                flexShrink: 0,
              }}
            >
              PBL
            </div>
            {!isSidebarCollapsed && (
              <div style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '0.3px', whiteSpace: 'nowrap' }}>
                PBL Portal
              </div>
            )}
          </div>
        )}

        {/* Mobile Brand Badge */}
        {isMobileView && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: '#0073aa',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '12px',
              flexShrink: 0,
            }}
          >
            PBL
          </div>
        )}

        <button
          type="button"
          onClick={onToggleSidebar}
          style={{
            border: 'none',
            background: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '8px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            minWidth: '36px',
            minHeight: '36px',
            justifyContent: 'center',
          }}
          title="Toggle Navigation Menu"
          aria-label="Toggle Navigation Menu"
        >
          <Menu size={20} />
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: isMobileView ? '8px' : '12px' }}>
        <div
          style={{
            backgroundColor: '#eef6fb',
            color: '#0073aa',
            fontSize: '11px',
            fontWeight: 700,
            padding: '4px 8px',
            borderRadius: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.3px',
            whiteSpace: 'nowrap',
          }}
        >
          {getRoleLabel(user?.role)}
        </div>

        <button
          type="button"
          onClick={() => navigate('/manager/dashboard')}
          style={{
            border: 'none',
            background: 'none',
            color: '#64748b',
            cursor: 'pointer',
            padding: '6px',
            borderRadius: '50%',
            display: 'flex',
            position: 'relative',
          }}
          title="Notifications"
        >
          <Bell size={19} />
        </button>

        <div style={{ position: 'relative' }} ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: dropdownOpen ? '#f1f5f9' : 'transparent',
              cursor: 'pointer',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 600,
                fontSize: '13px',
              }}
            >
              {userInitial}
            </div>
            <span style={{ fontSize: '13.5px', color: '#1e293b', fontWeight: 500 }}>
              {user?.name || 'Manager'}
            </span>
            <ChevronDown size={15} color="#64748b" />
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '44px',
                backgroundColor: '#ffffff',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                width: '210px',
                overflow: 'hidden',
                zIndex: 600,
              }}
            >
              <div style={{ padding: '12px 14px', borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                  {user?.name}
                </div>
                <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px', wordBreak: 'break-all' }}>
                  {user?.email}
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDropdownOpen(false);
                  navigate('/manager/dashboard');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#334155',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <UserIcon size={16} />
                <span>My Profile</span>
              </button>
              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  textAlign: 'left',
                  padding: '10px 14px',
                  fontSize: '13px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: '#dc2626',
                  cursor: 'pointer',
                  borderTop: '1px solid #f1f5f9',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fdecea')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
