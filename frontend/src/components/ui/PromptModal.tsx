import { AppModal } from './AppModal';
import { Button } from '../../shared/components/Button';

type PromptModalProps = {
  open: boolean;
  title: string;
  message: string;
  value: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  placeholder?: string;
  onChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function PromptModal({
  open,
  title,
  message,
  value,
  confirmLabel = 'Submit',
  cancelLabel = 'Cancel',
  danger = false,
  placeholder,
  onChange,
  onConfirm,
  onCancel,
}: PromptModalProps) {
  return (
    <AppModal
      open={open}
      title={title}
      onClose={onCancel}
      closeOnBackdrop={!danger}
      footer={
        <>
          <Button variant="secondary" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{message}</p>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className="min-h-28 w-full rounded-[8px] border px-3 py-2 text-sm outline-none transition"
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>
    </AppModal>
  );
}
