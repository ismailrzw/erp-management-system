import { useState, useEffect } from 'react';

export const DeadlineCountdown = ({ deadline, style = {} }) => {
  const [now, setNow] = useState(new Date());

  // Live tick every 60 seconds
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  if (!deadline) return null;

  const deadlineDate = new Date(deadline);
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
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#dc2626', animation: 'pulse 1.5s ease-in-out infinite' }} />
        <span>OVERDUE</span>
      </span>
    );
  }

  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;
  const isUrgent = days <= 2;

  let label;
  if (days > 0) {
    label = `${days}d ${hours}h remaining`;
  } else if (hours > 0) {
    label = `${hours}h ${minutes}m remaining`;
  } else {
    label = `${minutes}m remaining`;
  }

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
      <span>{label}</span>
    </span>
  );
};
