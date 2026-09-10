import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  FolderGit2,
  ClipboardList,
  ChevronDown,
  Compass,
  PlusCircle,
  User,
  LogOut,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/useAuth';

export const Sidebar = ({
  isCollapsed,
  isMobileView,
  isMobileDrawerOpen,
  onCloseMobileDrawer,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const [openMenus, setOpenMenus] = useState({
    students: false,
    depts: false,
    courses: false,
    teachers: false,
    groups: false,
    survey: false,
    studentGroup: false,
  });

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const isStudent = user?.role === 'student';

  const managerNavSections = [
    {
      section: 'Navigation',
      items: [
        {
          type: 'link',
          text: 'Dashboard',
          to: '/manager/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      section: 'Students',
      items: [
        {
          type: 'menu',
          key: 'students',
          text: 'Manage Students',
          icon: Users,
          subitems: [
            { text: 'Add New Student', to: '/manager/students/add' },
            { text: 'View All Students', to: '/manager/students/view' },
            { text: 'View Recycle Bin', to: '/manager/students/trash' },
          ],
        },
      ],
    },
    {
      section: 'Departments',
      items: [
        {
          type: 'menu',
          key: 'depts',
          text: 'Manage Department',
          icon: Building2,
          subitems: [
            { text: 'Add New Department', to: '/manager/departments/add' },
            { text: 'View All Departments', to: '/manager/departments/view' },
            { text: 'View Recycle Bin', to: '/manager/departments/trash' },
          ],
        },
      ],
    },
    {
      section: 'Courses',
      items: [
        {
          type: 'menu',
          key: 'courses',
          text: 'Manage Courses',
          icon: BookOpen,
          subitems: [
            { text: 'Add New Course', to: '/manager/courses/add' },
            { text: 'View All Courses', to: '/manager/courses/view' },
            { text: 'View Recycle Bin', to: '/manager/courses/trash' },
          ],
        },
      ],
    },
    {
      section: 'Teachers',
      items: [
        {
          type: 'menu',
          key: 'teachers',
          text: 'Manage Teachers',
          icon: GraduationCap,
          subitems: [
            { text: 'Add New Teacher', to: '/manager/teachers/add' },
            { text: 'View All Teachers', to: '/manager/teachers/view' },
            { text: 'View Recycle Bin', to: '/manager/teachers/trash' },
          ],
        },
      ],
    },
    {
      section: 'Groups',
      items: [
        {
          type: 'menu',
          key: 'groups',
          text: 'Manage Groups',
          icon: FolderGit2,
          subitems: [
            { text: 'All Project Groups', to: '/manager/groups/manage' },
          ],
        },
      ],
    },
    {
      section: 'Survey',
      items: [
        {
          type: 'menu',
          key: 'survey',
          text: 'Manage Survey',
          icon: ClipboardList,
          subitems: [
            { text: 'Add New Survey', to: '/manager/survey/add' },
            { text: 'View Surveys', to: '/manager/survey/view' },
            { text: 'Filled Report', to: '/manager/survey/report' },
          ],
        },
      ],
    },
    {
      section: 'Account',
      items: [
        {
          type: 'link',
          text: 'My Profile',
          to: '/manager/profile',
          icon: User,
        },
        {
          type: 'action',
          text: 'Logout',
          onClick: handleLogout,
          icon: LogOut,
          danger: true,
        },
      ],
    },
  ];

  const studentNavSections = [
    {
      section: 'Navigation',
      items: [
        {
          type: 'link',
          text: 'Dashboard',
          to: '/student/dashboard',
          icon: LayoutDashboard,
        },
      ],
    },
    {
      section: 'Project Group',
      items: [
        {
          type: 'link',
          text: 'My Group',
          to: '/student/group/my',
          icon: Users,
        },
        {
          type: 'link',
          text: 'Browse & Invites',
          to: '/student/group/browse',
          icon: Compass,
        },
        {
          type: 'link',
          text: 'Create Group',
          to: '/student/group/create',
          icon: PlusCircle,
        },
      ],
    },
    {
      section: 'Account',
      items: [
        {
          type: 'link',
          text: 'My Profile',
          to: '/student/profile',
          icon: User,
        },
        {
          type: 'action',
          text: 'Logout',
          onClick: handleLogout,
          icon: LogOut,
          danger: true,
        },
      ],
    },
  ];

  const navSections = isStudent ? studentNavSections : managerNavSections;

  const sidebarStyle = isMobileView
    ? {
        position: 'fixed',
        top: 0,
        left: 0,
        bottom: 0,
        width: '260px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 500,
        boxShadow: isMobileDrawerOpen ? '0 20px 25px -5px rgba(0, 0, 0, 0.2)' : 'none',
        transform: isMobileDrawerOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        paddingTop: '16px',
        paddingBottom: '30px',
      }
    : {
        position: 'fixed',
        top: '60px',
        left: 0,
        bottom: 0,
        width: isCollapsed ? '64px' : '240px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 400,
        transition: 'width 0.2s ease',
        paddingTop: '12px',
        paddingBottom: '30px',
      };

  const isCollapsedView = !isMobileView && isCollapsed;

  return (
    <aside style={sidebarStyle} aria-label="Sidebar Navigation">
      {/* Mobile Header in Drawer */}
      {isMobileView && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 18px 16px',
            borderBottom: '1px solid #e2e8f0',
            marginBottom: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: '#0073aa',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '14px',
              }}
            >
              PBL
            </div>
            <span style={{ fontWeight: 600, fontSize: '15px', color: '#1e293b' }}>
              {isStudent ? 'Student Portal' : 'PBL Portal'}
            </span>
          </div>
          <button
            type="button"
            onClick={onCloseMobileDrawer}
            style={{
              border: 'none',
              background: 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#64748b',
              cursor: 'pointer',
              padding: '4px',
            }}
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Navigation Sections */}
      {navSections.map((sec, secIdx) => (
        <div key={secIdx} style={{ marginBottom: '14px' }}>
          {!isCollapsedView && (
            <div
              style={{
                padding: '6px 18px',
                fontSize: '11px',
                fontWeight: 600,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              {sec.section}
            </div>
          )}

          {sec.items.map((item, itemIdx) => {
            const Icon = item.icon;
            if (item.type === 'link') {
              const isActive = location.pathname === item.to;
              return (
                <NavLink
                  key={itemIdx}
                  to={item.to}
                  onClick={() => isMobileView && onCloseMobileDrawer()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsedView ? 'center' : 'flex-start',
                    gap: isCollapsedView ? 0 : '10px',
                    padding: isCollapsedView ? '12px 0' : '10px 18px',
                    fontSize: '13.5px',
                    color: isActive ? '#0073aa' : '#334155',
                    backgroundColor: isActive ? '#eaf5fb' : 'transparent',
                    borderRight: isActive && !isCollapsedView ? '3px solid #0073aa' : 'none',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                  title={isCollapsedView ? item.text : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  {!isCollapsedView && <span>{item.text}</span>}
                </NavLink>
              );
            }

            if (item.type === 'action') {
              return (
                <button
                  key={itemIdx}
                  type="button"
                  onClick={() => {
                    if (isMobileView) onCloseMobileDrawer();
                    if (item.onClick) item.onClick();
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsedView ? 'center' : 'flex-start',
                    gap: isCollapsedView ? 0 : '10px',
                    padding: isCollapsedView ? '12px 0' : '10px 18px',
                    fontSize: '13.5px',
                    color: item.danger ? '#dc2626' : '#334155',
                    backgroundColor: 'transparent',
                    border: 'none',
                    width: '100%',
                    cursor: 'pointer',
                    fontWeight: 500,
                    textAlign: 'left',
                    transition: 'background-color 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = item.danger ? '#fdecea' : '#f1f5f9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                  title={isCollapsedView ? item.text : undefined}
                >
                  <Icon size={18} strokeWidth={1.8} color={item.danger ? '#dc2626' : undefined} />
                  {!isCollapsedView && <span>{item.text}</span>}
                </button>
              );
            }

            const isMenuOpen = openMenus[item.key];
            const hasActiveChild = item.subitems.some((sub) => location.pathname === sub.to);

            return (
              <div key={itemIdx}>
                <button
                  type="button"
                  onClick={() => !isCollapsedView && toggleMenu(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsedView ? 'center' : 'space-between',
                    width: '100%',
                    padding: isCollapsedView ? '12px 0' : '10px 18px',
                    fontSize: '13.5px',
                    color: hasActiveChild ? '#0073aa' : '#334155',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: hasActiveChild ? 600 : 500,
                    textAlign: 'left',
                  }}
                  title={isCollapsedView ? item.text : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsedView ? 0 : '10px' }}>
                    <Icon size={18} strokeWidth={hasActiveChild ? 2.2 : 1.8} />
                    {!isCollapsedView && <span>{item.text}</span>}
                  </div>
                  {!isCollapsedView && (
                    <ChevronDown
                      size={15}
                      style={{
                        transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  )}
                </button>

                {!isCollapsedView && isMenuOpen && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '4px 0' }}>
                    {item.subitems.map((sub, subIdx) => {
                      const isSubActive = location.pathname === sub.to;
                      return (
                        <NavLink
                          key={subIdx}
                          to={sub.to}
                          onClick={() => isMobileView && onCloseMobileDrawer()}
                          style={{
                            display: 'block',
                            padding: '8px 18px 8px 46px',
                            fontSize: '13px',
                            color: isSubActive ? '#0073aa' : '#64748b',
                            fontWeight: isSubActive ? 600 : 400,
                            backgroundColor: isSubActive ? '#eaf5fb' : 'transparent',
                            textDecoration: 'none',
                          }}
                        >
                          {sub.text}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </aside>
  );
};

