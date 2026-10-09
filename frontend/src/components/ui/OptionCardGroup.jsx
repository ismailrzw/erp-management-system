/**
 * Modern interactive option card selector group.
 * Matches the interactive cards on BroadcastMail & provides unified styling.
 */
export const OptionCardGroup = ({
  options = [],
  value,
  onChange,
  disabled = false,
  columns = 'repeat(auto-fit, minmax(240px, 1fr))',
  style = {},
}) => {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: '14px',
        ...style,
      }}
    >
      {options.map((opt) => {
        const isSelected = value === opt.value;
        const Icon = opt.icon;

        return (
          <div
            key={opt.value}
            onClick={() => {
              if (!disabled && onChange) {
                onChange(opt.value);
              }
            }}
            style={{
              border: isSelected ? '2px solid #0073aa' : '1px solid #cbd5e1',
              backgroundColor: isSelected ? '#f0f9ff' : '#ffffff',
              borderRadius: '8px',
              padding: '14px 16px',
              cursor: disabled ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              transition: 'all 0.15s ease',
              opacity: disabled ? 0.6 : 1,
              boxShadow: isSelected ? '0 2px 8px rgba(0, 115, 170, 0.12)' : '0 1px 2px rgba(0, 0, 0, 0.02)',
              userSelect: 'none',
            }}
          >
            {Icon && (
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  backgroundColor: isSelected ? '#0073aa' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={18} />
              </div>
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: '13.5px',
                  fontWeight: 700,
                  color: isSelected ? '#0073aa' : '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>{opt.label}</span>
                {opt.badge && (
                  <span
                    style={{
                      fontSize: '10.5px',
                      fontWeight: 600,
                      backgroundColor: isSelected ? '#0073aa' : '#e2e8f0',
                      color: isSelected ? '#ffffff' : '#475569',
                      padding: '1px 6px',
                      borderRadius: '10px',
                    }}
                  >
                    {opt.badge}
                  </span>
                )}
              </div>
              {opt.description && (
                <div
                  style={{
                    fontSize: '12px',
                    color: '#64748b',
                    marginTop: '3px',
                    lineHeight: 1.4,
                  }}
                >
                  {opt.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
