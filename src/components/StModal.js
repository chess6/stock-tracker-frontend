export default function StModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmClassName = 'st-btn',
  onConfirm,
  onCancel,
}) {
  if (!isOpen) return null;

  return (
    <div className="st-modal-backdrop" onClick={onCancel} role="presentation">
      <div
        className="st-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="st-modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="st-modal-header">
          <h2 id="st-modal-title" className="st-modal-title">{title}</h2>
          <button type="button" className="st-modal-close" onClick={onCancel} aria-label="Close">×</button>
        </div>
        <div className="st-modal-body">{message}</div>
        <div className="st-modal-footer">
          <button type="button" className="st-btn-ghost" onClick={onCancel}>Cancel</button>
          <button
            type="button"
            className={confirmClassName}
            style={confirmClassName === 'st-btn' ? { borderColor: 'var(--st-negative)', color: 'var(--st-negative)' } : undefined}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
