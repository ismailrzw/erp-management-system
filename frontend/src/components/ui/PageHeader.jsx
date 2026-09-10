import { ChevronRight } from 'lucide-react';

export const PageHeader = ({
  title,
  subtitle,
  badge,
  breadcrumbs = [],
  children,
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        marginBottom: '20px',
        ...style,
      }}
    >
      <div style={{ minWidth: 0, flex: '1 1 auto' }}>
        {breadcrumbs.length > 0 && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              color: '#64748b',
              marginBottom: '4px',
            }}
          >
            {breadcrumbs.map((crumb, idx) => (
              <span key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                {idx > 0 && <ChevronRight size={12} />}
                {crumb.to ? (
                  <a href={crumb.to} style={{ color: '#0073aa', textDecoration: 'none' }}>
                    {crumb.label}
                  </a>
                ) : (
                  <span>{crumb.label}</span>
                )}
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <h1
            style={{
              margin: 0,
              fontSize: '22px',
              fontWeight: 700,
              color: 'var(--heading)',
              letterSpacing: '-0.2px',
              wordBreak: 'break-word',
            }}
          >
            {title}
          </h1>
          {badge}
        </div>

        {subtitle && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '13.5px',
              color: 'var(--body-text)',
              wordBreak: 'break-word',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {children && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            flexWrap: 'wrap',
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
