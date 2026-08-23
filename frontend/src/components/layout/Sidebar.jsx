import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  BookOpen,
  GraduationCap,
  FolderGit2,
  ClipboardList,
  ChevronDown,
} from 'lucide-react';

export const Sidebar = ({ isCollapsed }) => {
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({
    students: false,
    depts: false,
    courses: false,
    teachers: false,
    groups: false,
    survey: false,
  });

  const toggleMenu = (key) => {
    setOpenMenus((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const navSections = [
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
  ];

  return (
    <aside
      style={{
        position: 'fixed',
        top: '60px',
        left: 0,
        bottom: 0,
        width: isCollapsed ? '64px' : '235px',
        backgroundColor: '#ffffff',
        borderRight: '1px solid #e2e8f0',
        overflowY: 'auto',
        overflowX: 'hidden',
        zIndex: 400,
        transition: 'width 0.2s ease',
        paddingBottom: '30px',
      }}
    >
      {navSections.map((sec, idx) => (
        <div key={idx} style={{ marginBottom: '4px' }}>
          {!isCollapsed && (
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#94a3b8',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
                padding: '16px 18px 6px',
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
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'flex-start',
                    gap: isCollapsed ? 0 : '10px',
                    padding: isCollapsed ? '12px 0' : '10px 18px',
                    fontSize: '13.5px',
                    color: isActive ? '#0073aa' : '#334155',
                    backgroundColor: isActive ? '#eaf5fb' : 'transparent',
                    borderRight: isActive && !isCollapsed ? '3px solid #0073aa' : 'none',
                    fontWeight: isActive ? 600 : 500,
                    textDecoration: 'none',
                    transition: 'background-color 0.15s ease',
                  }}
                  title={isCollapsed ? item.text : undefined}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                  {!isCollapsed && <span>{item.text}</span>}
                </NavLink>
              );
            }

            const isMenuOpen = openMenus[item.key];
            const hasActiveChild = item.subitems.some((sub) => location.pathname === sub.to);

            return (
              <div key={itemIdx}>
                <button
                  type="button"
                  onClick={() => !isCollapsed && toggleMenu(item.key)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed ? 'center' : 'space-between',
                    width: '100%',
                    padding: isCollapsed ? '12px 0' : '10px 18px',
                    fontSize: '13.5px',
                    color: hasActiveChild ? '#0073aa' : '#334155',
                    backgroundColor: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: hasActiveChild ? 600 : 500,
                    textAlign: 'left',
                  }}
                  title={isCollapsed ? item.text : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: isCollapsed ? 0 : '10px' }}>
                    <Icon size={18} strokeWidth={hasActiveChild ? 2.2 : 1.8} />
                    {!isCollapsed && <span>{item.text}</span>}
                  </div>
                  {!isCollapsed && (
                    <ChevronDown
                      size={15}
                      style={{
                        transform: isMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s ease',
                      }}
                    />
                  )}
                </button>

                {!isCollapsed && isMenuOpen && (
                  <div style={{ backgroundColor: '#f8fafc', padding: '4px 0' }}>
                    {item.subitems.map((sub, subIdx) => {
                      const isSubActive = location.pathname === sub.to;
                      return (
                        <NavLink
                          key={subIdx}
                          to={sub.to}
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
