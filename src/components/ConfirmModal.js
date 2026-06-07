import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from 'reactstrap';

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
    <Modal isOpen={isOpen} toggle={onCancel} centered>
      <ModalHeader toggle={onCancel}>{title}</ModalHeader>
      <ModalBody>{message}</ModalBody>
      <ModalFooter>
        <Button color="secondary" outline onClick={onCancel}>Cancel</Button>
        <Button color={confirmColor} onClick={onConfirm}>{confirmLabel}</Button>
      </ModalFooter>
    </Modal>
  );
}
