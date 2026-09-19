import { Modal } from './Modal';

/**
 * ConfirmDialog — standardized confirmation modal.
 * Replaces the 9 identical inline "Are you sure?" patterns across list pages.
 *
 * Props:
 *  isOpen       — boolean
 *  onClose      — () => void
 *  onConfirm    — () => void
 *  loading      — boolean  (shows "Please wait…" and disables both buttons)
 *  title        — string   (modal header)
 *  message      — string | ReactNode
 *  confirmLabel — string   (default: "Delete")
 *  variant      — "danger" | "primary" | "success"  (default: "danger")
 *  maxWidth     — string   (default: "420px")
 */
export const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  loading = false,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Delete',
  variant = 'danger',
  maxWidth = '420px',
}) => (
  <Modal isOpen={isOpen} onClose={loading ? undefined : onClose} title={title} maxWidth={maxWidth}>
    <p style={{ fontSize: '13.5px', color: '#475569', lineHeight: 1.6, margin: '0 0 20px' }}>
      {message}
    </p>
    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onClose}
        disabled={loading}
      >
        Cancel
      </button>
      <button
        type="button"
        className={`btn btn-${variant} btn-sm`}
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? 'Please wait…' : confirmLabel}
      </button>
    </div>
  </Modal>
);
