import { Layers, GraduationCap, Clock, Users, Bell, Mail, FolderGit2, Megaphone } from 'lucide-react';

const iconMap = {
  layers: Layers,
  teacher: GraduationCap,
  clock: Clock,
  users: Users,
  bell: Bell,
  mail: Mail,
  folder: FolderGit2,
  megaphone: Megaphone,
};

const badgeStyles = {
  primary: { bg: '#eaf5fb', color: '#0073aa', border: '#bde0f5' },
  success: { bg: '#eafbf1', color: '#16a34a', border: '#bcf0d2' },
  warning: { bg: '#fef9e7', color: '#ca8a04', border: '#fbeab2' },
  info: { bg: '#eef6fb', color: '#0284c7', border: '#bae6fd' },
  danger: { bg: '#fdecea', color: '#dc2626', border: '#fbc5bf' },
  muted: { bg: '#f1f5f9', color: '#64748b', border: '#e2e8f0' },
};

export const StatCard = ({
  title,
  count,
  value,
  icon,
  iconName = 'layers',
  variant,
  color = 'primary',
  subtext,
  onClick,
  style = {},
}) => {
  // Support both Lucide component passed in `icon` prop or string lookup in `iconName`
  const IconComponent = icon || iconMap[iconName] || Layers;
  const styleKey = variant || color || 'primary';
  const badge = badgeStyles[styleKey] || badgeStyles.primary;

  const displayValue = value !== undefined ? value : (count ?? 0);
  const isStringValue = typeof displayValue === 'string' && isNaN(Number(displayValue));

  return (
    <div
      onClick={onClick}
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        padding: '18px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        ...style,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
        }
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        <div
          style={{
            fontSize: isStringValue ? '18px' : '26px',
            fontWeight: 700,
            color: '#1e293b',
            lineHeight: 1.2,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
          title={typeof displayValue === 'string' ? displayValue : undefined}
        >
          {displayValue}
        </div>

        <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', fontWeight: 500 }}>
          {title}
        </div>

        {subtext && (
          <div
            style={{
              fontSize: '11.5px',
              color: '#94a3b8',
              marginTop: '3px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {subtext}
          </div>
        )}
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
