
export const DeadlineCountdown = ({ deadline, style = {} }) => {
  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate - now;
  const isPast = diffMs < 0;

  if (isPast) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '2px 8px',
          fontSize: '12px',
          fontWeight: 600,
          borderRadius: '12px',
          backgroundColor: '#fee2e2',
          color: '#b91c1c',
          border: '1px solid #fecaca',
          lineHeight: 1.2,
          whiteSpace: 'nowrap',
          ...style,
        }}
      >
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626' }} />
        <span>OVERDUE</span>
      </span>
    );
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const isUrgent = days <= 2;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        padding: '2px 8px',
        fontSize: '12px',
        fontWeight: 600,
        borderRadius: '12px',
        backgroundColor: isUrgent ? '#fef3c7' : '#dcfce7',
        color: isUrgent ? '#92400e' : '#15803d',
        border: `1px solid ${isUrgent ? '#fde68a' : '#bbf7d0'}`,
        lineHeight: 1.2,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      <span
        style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: isUrgent ? '#d97706' : '#16a34a',
        }}
      />
      <span>{days}d {hours}h remaining</span>
    </span>
  );
};
