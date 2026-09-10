import { useEffect } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

export const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [message, duration, onClose]);

  if (!message) return null;

  const config = {
    success: { bg: '#10b981', icon: CheckCircle },
    error: { bg: '#ef4444', icon: AlertCircle },
    info: { bg: '#0073aa', icon: Info },
  }[type] || { bg: '#0073aa', icon: Info };

  const IconComponent = config.icon;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        backgroundColor: config.bg,
        color: '#ffffff',
        padding: '12px 18px',
        borderRadius: '6px',
        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        fontSize: '13.5px',
        fontWeight: 500,
        zIndex: 2000,
        animation: 'slideUp 0.2s ease',
      }}
    >
      <IconComponent size={18} />
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: '#ffffff',
          opacity: 0.8,
          cursor: 'pointer',
          padding: 0,
          marginLeft: '6px',
          display: 'flex',
        }}
      >
        <X size={14} />
      </button>
    </div>
  );
};
