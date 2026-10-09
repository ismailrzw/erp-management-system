import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * Modern Collapsible Section component for dashboard & workspace panels.
 */
export const CollapsibleSection = ({
  title,
  subtitle = null,
  icon: Icon = null,
  badge = null,
  defaultOpen = false,
  children,
  headerAction = null,
  style = {},
  containerStyle = {},
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: isOpen ? '1px solid rgba(0, 115, 170, 0.35)' : '1px solid #e2e8f0',
        marginBottom: '16px',
        overflow: 'hidden',
        boxShadow: isOpen ? '0 3px 10px rgba(0, 115, 170, 0.06)' : '0 1px 3px rgba(0, 0, 0, 0.03)',
        transition: 'all 0.2s ease',
        ...containerStyle,
      }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          backgroundColor: isOpen ? '#f8fafc' : '#ffffff',
          userSelect: 'none',
          gap: '12px',
          transition: 'background-color 0.15s ease',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
          {Icon && (
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '6px',
                backgroundColor: isOpen ? '#eaf5fb' : '#f1f5f9',
                color: isOpen ? '#0073aa' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s ease',
              }}
            >
              <Icon size={17} />
            </div>
          )}
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: '14.5px', fontWeight: 700, color: '#0f172a' }}>
                {title}
              </h3>
              {badge && (
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    backgroundColor: '#eef6fb',
                    color: '#0073aa',
                  }}
                >
                  {badge}
                </span>
              )}
            </div>
            {subtitle && (
              <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          {headerAction && (
            <div onClick={(e) => e.stopPropagation()}>
              {headerAction}
            </div>
          )}
          <div
            style={{
              color: isOpen ? '#0073aa' : '#94a3b8',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDown size={18} />
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          style={{
            padding: '18px 20px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#ffffff',
            ...style,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
};
