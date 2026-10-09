import { useEffect, useRef, useId } from 'react';
import { X } from 'lucide-react';

export const Modal = ({ isOpen, onClose, title, children, maxWidth = '500px' }) => {
  const dialog = useRef(null);
  const close = useRef(onClose);
  const titleId = useId();
  useEffect(() => { close.current = onClose; }, [onClose]);
  useEffect(() => {
    if (!isOpen) return;
    const previous = document.activeElement;
    const focusable = () => Array.from(dialog.current?.querySelectorAll('button, input, select, textarea, a[href], [tabindex="0"]') || []).filter(element => !element.disabled && element.getClientRects().length);
    const frame = requestAnimationFrame(() => (focusable()[0] || dialog.current)?.focus());
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') close.current();
      if (event.key === 'Tab') {
        const elements = focusable(); const first = elements[0]; const last = elements.at(-1);
        if (!first) { event.preventDefault(); dialog.current?.focus(); }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => { cancelAnimationFrame(frame); window.removeEventListener('keydown', handleKeyDown); previous?.focus(); };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        backdropFilter: 'blur(3px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
      }}
      onClick={onClose}
    >
      <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          width: '100%',
          maxWidth: `min(calc(100vw - 24px), ${maxWidth})`,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
          overflow: 'hidden',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexShrink: 0,
          }}
        >
          <h3 id={titleId} style={{ margin: 0, fontSize: '15.5px', fontWeight: 600, color: '#1e293b' }}>
            {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: 'none',
              background: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '18px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
};
