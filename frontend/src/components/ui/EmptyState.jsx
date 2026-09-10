export const EmptyState = ({
  icon: Icon,
  title,
  description,
  action,
  style = {},
}) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '42px 16px',
        color: 'var(--body-text)',
        ...style,
      }}
    >
      {Icon && (
        <div
          style={{
            width: '54px',
            height: '54px',
            borderRadius: '50%',
            backgroundColor: '#f1f5f9',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 12px',
          }}
        >
          <Icon size={26} />
        </div>
      )}

      {title && (
        <h3
          style={{
            margin: '0 0 6px',
            fontSize: '15.5px',
            fontWeight: 600,
            color: 'var(--heading)',
          }}
        >
          {title}
        </h3>
      )}

      {description && (
        <p
          style={{
            margin: 0,
            fontSize: '13px',
            color: 'var(--muted)',
            maxWidth: '420px',
            marginInline: 'auto',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}

      {action && <div style={{ marginTop: '16px' }}>{action}</div>}
    </div>
  );
};
