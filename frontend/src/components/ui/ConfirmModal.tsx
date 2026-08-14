import { AppModal } from './AppModal';
import { Button } from '../../shared/components/Button';

type ConfirmModalProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'warning' | 'danger';
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <AppModal
      open={open}
      title={title}
      onClose={onCancel}
      closeOnBackdrop={variant !== 'danger'}
      closeOnEscape={variant !== 'danger'}
      width="440px"
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <p className="whitespace-pre-line text-sm" style={{ color: 'var(--color-text-secondary)' }}>
        {message}
      </p>
    </AppModal>
  );
}
