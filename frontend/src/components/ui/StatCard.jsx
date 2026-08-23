import { Layers, GraduationCap, Clock, Users, Bell } from 'lucide-react';

const iconMap = {
  layers: Layers,
  teacher: GraduationCap,
  clock: Clock,
  users: Users,
  bell: Bell,
};

const badgeStyles = {
  primary: { bg: '#eaf5fb', color: '#0073aa', border: '#bde0f5' },
  success: { bg: '#eafbf1', color: '#16a34a', border: '#bcf0d2' },
  warning: { bg: '#fef9e7', color: '#ca8a04', border: '#fbeab2' },
  info: { bg: '#eef6fb', color: '#0284c7', border: '#bae6fd' },
  danger: { bg: '#fdecea', color: '#dc2626', border: '#fbc5bf' },
};

export const StatCard = ({ title, count, iconName = 'layers', variant = 'primary' }) => {
  const IconComponent = iconMap[iconName] || Layers;
  const badge = badgeStyles[variant] || badgeStyles.primary;

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    >
      <div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', lineHeight: 1.2 }}>
          {count ?? 0}
        </div>
        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
          {title}
        </div>
      </div>
      <div
        style={{
          width: '46px',
          height: '46px',
          borderRadius: '10px',
          backgroundColor: badge.bg,
          color: badge.color,
          border: `1px solid ${badge.border}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <IconComponent size={22} strokeWidth={2} />
      </div>
    </div>
  );
};
