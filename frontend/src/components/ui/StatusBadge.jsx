export const StatusBadge = ({ status, size = 'medium', style = {} }) => {
  const norm = (status || '').toLowerCase();

  const configs = {
    pending: {
      label: 'Pending',
      bg: '#fef3c7',
      color: '#92400e',
      border: '#fde68a',
      dot: '#d97706',
    },
    approved: {
      label: 'Approved',
      bg: '#dcfce7',
      color: '#15803d',
      border: '#bbf7d0',
      dot: '#16a34a',
    },
    rejected: {
      label: 'Rejected',
      bg: '#fee2e2',
      color: '#b91c1c',
      border: '#fecaca',
      dot: '#dc2626',
    },
    evaluated: {
      label: 'Evaluated',
      bg: '#e0e7ff',
      color: '#4338ca',
      border: '#c7d2fe',
      dot: '#4f46e5',
    },
    active: {
      label: 'Active',
      bg: '#e0f2fe',
      color: '#0369a1',
      border: '#bae6fd',
      dot: '#0284c7',
    },
    deleted: {
      label: 'Deleted',
      bg: '#f1f5f9',
      color: '#64748b',
      border: '#e2e8f0',
      dot: '#94a3b8',
    },
  };

  const current = configs[norm] || {
    label: status || 'Unknown',
    bg: '#f1f5f9',
    color: '#475569',
    border: '#e2e8f0',
    dot: '#64748b',
  };

  const isSmall = size === 'small';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: isSmall ? '1.5px 6px' : '3px 9px',
        fontSize: isSmall ? '11px' : '12px',
        fontWeight: 600,
        borderRadius: '12px',
        backgroundColor: current.bg,
        color: current.color,
        border: `1px solid ${current.border}`,
        textTransform: 'capitalize',
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: isSmall ? '5px' : '6px',
          height: isSmall ? '5px' : '6px',
          borderRadius: '50%',
          backgroundColor: current.dot,
          display: 'inline-block',
        }}
      />
      <span>{current.label}</span>
    </span>
  );
};
