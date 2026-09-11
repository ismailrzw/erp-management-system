import React from 'react';

/**
 * Modern SaaS-grade Select Component
 *
 * Supports left icon, label, error state, helper text, custom options array or direct children.
 */
export const Select = React.forwardRef(({
  label,
  name,
  value,
  onChange,
  options = null,
  children = null,
  icon: Icon = null,
  placeholder = null,
  required = false,
  error = null,
  helperText = null,
  disabled = false,
  containerStyle = {},
  style = {},
  className = '',
  id = null,
  ...rest
}, ref) => {
  const selectId = id || (name ? `select-${name}` : undefined);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%', ...containerStyle }}>
      {label && (
        <label
          htmlFor={selectId}
          style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: 600,
            color: '#334155',
          }}
        >
          {label}
          {required && <span style={{ color: '#dc2626', marginLeft: '3px' }}>*</span>}
        </label>
      )}

      <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <div
            style={{
              position: 'absolute',
              left: '11px',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: disabled ? '#94a3b8' : '#64748b',
              zIndex: 1,
            }}
          >
            <Icon size={16} />
          </div>
        )}

        <select
          ref={ref}
          id={selectId}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={className}
          style={{
            width: '100%',
            paddingLeft: Icon ? '36px' : '12px',
            paddingRight: '34px',
            paddingTop: '8px',
            paddingBottom: '8px',
            borderRadius: '8px',
            border: error ? '1px solid #ef4444' : '1px solid #cbd5e1',
            backgroundColor: disabled ? '#f8fafc' : '#ffffff',
            color: disabled ? '#94a3b8' : '#1e293b',
            fontSize: '13.5px',
            fontWeight: 500,
            outline: 'none',
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: error ? '0 0 0 3px rgba(239, 68, 68, 0.14)' : undefined,
            ...style,
          }}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}

          {options
            ? options.map((opt) => {
                if (typeof opt === 'string') {
                  return (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  );
                }
                return (
                  <option
                    key={opt.value ?? opt.id ?? opt.label}
                    value={opt.value}
                    disabled={opt.disabled}
                    style={opt.style}
                  >
                    {opt.label ?? opt.name ?? opt.value}
                  </option>
                );
              })
            : children}
        </select>
      </div>

      {error && (
        <span style={{ fontSize: '11.5px', color: '#dc2626', marginTop: '2px', fontWeight: 500 }}>
          {error}
        </span>
      )}

      {!error && helperText && (
        <span style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
          {helperText}
        </span>
      )}
    </div>
  );
});

Select.displayName = 'Select';
