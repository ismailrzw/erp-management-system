import { useLocation, useNavigate } from 'react-router-dom';
import { Flag, Eye, Sliders } from 'lucide-react';

export const IterationsTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const isSubmissions = location.pathname.includes('/submissions');
  const isRubrics = location.pathname.includes('/rubric-templates');
  const isMilestones = !isSubmissions && !isRubrics;

  const handleNav = (targetPath, isActive) => {
    if (!isActive) {
      navigate(targetPath);
    }
  };

  const tabs = [
    {
      key: 'milestones',
      label: 'Milestones',
      icon: Flag,
      path: '/manager/iterations',
      active: isMilestones,
    },
    {
      key: 'submissions',
      label: 'Submissions',
      icon: Eye,
      path: '/manager/iterations/submissions',
      active: isSubmissions,
    },
    {
      key: 'rubrics',
      label: 'Rubrics',
      icon: Sliders,
      path: '/manager/rubric-templates',
      active: isRubrics,
    },
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid #e2e8f0',
        paddingBottom: '12px',
        marginBottom: '20px',
        gap: '12px',
        overflowX: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexShrink: 0 }}>
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => handleNav(tab.path, tab.active)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '13.5px',
                fontWeight: tab.active ? 600 : 500,
                color: tab.active ? 'var(--primary)' : '#64748b',
                background: 'none',
                border: 'none',
                cursor: tab.active ? 'default' : 'pointer',
                padding: '0 0 8px 0',
                position: 'relative',
                transition: 'color 0.15s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <Icon size={tab.active ? 16 : 15} strokeWidth={tab.active ? 2.2 : 1.8} />
              <span>{tab.label}</span>
              {tab.active && (
                <span
                  style={{
                    position: 'absolute',
                    bottom: '-13px',
                    left: 0,
                    right: 0,
                    height: '2px',
                    backgroundColor: 'var(--primary)',
                    borderRadius: '2px',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Academic Term Indicator — hidden on very narrow screens */}
      <div className="hide-mobile" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#64748b', flexShrink: 0 }}>
        <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', flexShrink: 0 }} />
        <span style={{ whiteSpace: 'nowrap' }}>Active Academic Semester</span>
      </div>
    </div>
  );
};
