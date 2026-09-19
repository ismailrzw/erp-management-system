import { useMemo } from 'react';
import { Calendar, Clock, X, Check } from 'lucide-react';

/**
 * Format ISO/datetime string to a human friendly format (e.g. "Thu, 15 Oct 2026, 11:59 PM")
 */
const formatHuman = (str) => {
  if (!str) return null;
  const d = new Date(str);
  if (isNaN(d.getTime())) return str;
  return d.toLocaleDateString('en-PK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * Relative time helper (e.g. "in 3 days", "tomorrow", "past deadline")
 */
const getRelativeLabel = (str) => {
  if (!str) return null;
  const target = new Date(str).getTime();
  const now = Date.now();
  if (isNaN(target)) return null;

  const diffMs = target - now;
  if (diffMs < 0) return 'Deadline has passed';

  const diffHours = Math.round(diffMs / (1000 * 60 * 60));
  if (diffHours < 24) return `in ${diffHours} hour${diffHours === 1 ? '' : 's'}`;

  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Tomorrow';
  return `in ${diffDays} days`;
};

export const DateTimePicker = ({
  label = 'Deadline Date & Time',
  value = '',
  onChange,
  required = false,
  error = null,
  helperText = null,
  disabled = false,
  minDate = null,
  containerStyle = {},
}) => {
  // Split value into date and time
  const { datePart, timePart } = useMemo(() => {
    if (!value) return { datePart: '', timePart: '23:59' };
    if (value.includes('T')) {
      const [d, t] = value.split('T');
      return { datePart: d || '', timePart: t ? t.slice(0, 5) : '23:59' };
    }
    if (value.includes(' ')) {
      const [d, t] = value.split(' ');
      return { datePart: d || '', timePart: t ? t.slice(0, 5) : '23:59' };
    }
    return { datePart: value, timePart: '23:59' };
  }, [value]);

  const handleDateChange = (newDate) => {
    if (!newDate) {
      onChange('');
      return;
    }
    const t = timePart || '23:59';
    onChange(`${newDate}T${t}`);
  };

  const handleTimeChange = (newTime) => {
    let d = datePart;
    if (!d) {
      // Default to today if date not set yet
      const today = new Date();
      d = today.toISOString().split('T')[0];
    }
    onChange(`${d}T${newTime || '23:59'}`);
  };

  const formattedValue = formatHuman(value);
  const relativeLabel = getRelativeLabel(value);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', ...containerStyle }}>
      {/* Label and Clear */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <label style={{ fontSize: '13px', fontWeight: 600, color: '#334155', display: 'flex', alignItems: 'center', gap: '4px' }}>
          {label}
          {required && <span style={{ color: '#dc2626' }}>*</span>}
        </label>
        {value && !disabled && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '11.5px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '2px 6px',
              borderRadius: '4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}
          >
            <X size={12} /> Clear
          </button>
        )}
      </div>

      {/* Main Picker Card */}
      <div
        style={{
          border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '12px',
          backgroundColor: '#ffffff',
          boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.14)' : '0 1px 3px rgba(0, 0, 0, 0.04)',
          transition: 'all 0.15s ease',
        }}
      >
        {/* Dual Controls: Date + Time */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
          {/* Date Control */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Select Date
            </label>
            <div style={{ position: 'relative' }}>
              <Calendar
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="date"
                value={datePart}
                min={minDate || undefined}
                onChange={(e) => handleDateChange(e.target.value)}
                disabled={disabled}
                required={required}
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: '10px',
                  paddingTop: '7px',
                  paddingBottom: '7px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: disabled ? '#f8fafc' : '#ffffff',
                }}
              />
            </div>
          </div>

          {/* Time Control */}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px' }}>
              Select Time
            </label>
            <div style={{ position: 'relative' }}>
              <Clock
                size={15}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#64748b',
                  pointerEvents: 'none',
                }}
              />
              <input
                type="time"
                value={timePart}
                onChange={(e) => handleTimeChange(e.target.value)}
                disabled={disabled}
                style={{
                  width: '100%',
                  paddingLeft: '34px',
                  paddingRight: '10px',
                  paddingTop: '7px',
                  paddingBottom: '7px',
                  fontSize: '13px',
                  fontWeight: 500,
                  borderRadius: '7px',
                  border: '1px solid #cbd5e1',
                  backgroundColor: disabled ? '#f8fafc' : '#ffffff',
                }}
              />
            </div>
          </div>
        </div>

        {/* Formatted Preview Badge */}
        {formattedValue && (
          <div
            style={{
              marginTop: '10px',
              padding: '8px 12px',
              borderRadius: '6px',
              backgroundColor: '#f0fdf4',
              border: '1px solid #bbf7d0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#166534', fontWeight: 600 }}>
              <Check size={14} style={{ color: '#16a34a' }} />
              <span>{formattedValue}</span>
            </div>
            {relativeLabel && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  backgroundColor: relativeLabel.includes('passed') ? '#fee2e2' : '#dcfce7',
                  color: relativeLabel.includes('passed') ? '#dc2626' : '#15803d',
                }}
              >
                {relativeLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {error && (
        <span style={{ fontSize: '11.5px', color: '#dc2626', fontWeight: 500 }}>
          {error}
        </span>
      )}

      {!error && helperText && (
        <span style={{ fontSize: '11.5px', color: '#64748b' }}>
          {helperText}
        </span>
      )}
    </div>
  );
};
