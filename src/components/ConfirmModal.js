import StModal from './StModal';

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'danger',
  onConfirm,
  onCancel,
}) {
  return (
    <StModal
      isOpen={isOpen}
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      confirmClassName={confirmColor === 'danger' ? 'st-btn' : 'st-btn-primary'}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
