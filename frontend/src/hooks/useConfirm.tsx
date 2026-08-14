import { useCallback, useState } from 'react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PromptModal } from '../components/ui/PromptModal';
import { AppModal } from '../components/ui/AppModal';
import { Button } from '../shared/components/Button';

type ConfirmOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  variant?: 'default' | 'warning' | 'danger';
};

type PromptOptions = ConfirmOptions & {
  placeholder?: string;
  defaultValue?: string;
};

type AlertOptions = {
  title: string;
  message: string;
  confirmLabel?: string;
};

type ModalState =
  | null
  | ({ kind: 'confirm' } & ConfirmOptions & { resolve: (value: boolean) => void })
  | ({ kind: 'prompt' } & PromptOptions & { resolve: (value: string | null) => void })
  | ({ kind: 'alert' } & AlertOptions & { resolve: () => void });

export function useConfirm() {
  const [modal, setModal] = useState<ModalState>(null);
  const [promptValue, setPromptValue] = useState('');

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setModal({ ...options, kind: 'confirm', resolve });
    });
  }, []);

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(options.defaultValue || '');
      setModal({ ...options, kind: 'prompt', resolve });
    });
  }, []);

  const alert = useCallback((options: AlertOptions) => {
    return new Promise<void>((resolve) => {
      setModal({ ...options, kind: 'alert', resolve });
    });
  }, []);

  function close() {
    if (!modal) return;

    if (modal.kind === 'confirm') {
      modal.resolve(false);
    } else if (modal.kind === 'prompt') {
      modal.resolve(null);
    } else {
      modal.resolve();
    }

    setModal(null);
  }

  function accept() {
    if (!modal) return;

    if (modal.kind === 'confirm') {
      modal.resolve(true);
    } else if (modal.kind === 'prompt') {
      modal.resolve(promptValue);
    } else {
      modal.resolve();
    }

    setModal(null);
  }

  const modalElement =
    modal?.kind === 'confirm' ? (
      <ConfirmModal
        open
        title={modal.title}
        message={modal.message}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        variant={modal.danger ? 'danger' : (modal.variant ?? 'default')}
        onConfirm={accept}
        onCancel={close}
      />
    ) : modal?.kind === 'prompt' ? (
      <PromptModal
        open
        title={modal.title}
        message={modal.message}
        value={promptValue}
        confirmLabel={modal.confirmLabel}
        cancelLabel={modal.cancelLabel}
        danger={modal.danger}
        placeholder={modal.placeholder}
        onChange={setPromptValue}
        onConfirm={accept}
        onCancel={close}
      />
    ) : modal?.kind === 'alert' ? (
      <AppModal
        open
        title={modal.title}
        onClose={accept}
        footer={
          <Button variant="primary" onClick={accept}>
            {modal.confirmLabel || 'OK'}
          </Button>
        }
      >
        <p>{modal.message}</p>
      </AppModal>
    ) : null;

  return {
    confirm,
    prompt,
    alert,
    modalElement,
  };
}
