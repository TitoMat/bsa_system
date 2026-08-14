import type { ReactNode } from 'react';
import { useEffect, useId } from 'react';
import { createPortal } from 'react-dom';

type AppModalProps = {
  open: boolean;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
  className?: string;
  width?: string;
};

export function AppModal({
  open,
  title,
  children,
  footer,
  onClose,
  closeOnBackdrop = true,
  closeOnEscape = true,
  className,
  width,
}: AppModalProps) {
  const titleId = useId();

  useEffect(() => {
    if (!open) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeOnEscape, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center overflow-y-auto px-4 py-6"
      style={{ background: 'var(--color-overlay)', backdropFilter: 'blur(4px)' }}
      onMouseDown={closeOnBackdrop ? onClose : undefined}
      role="presentation"
    >
      <div
        className={['flex max-h-[calc(100vh-3rem)] w-full flex-col overflow-hidden rounded-[16px] shadow-xl', className].filter(Boolean).join(' ')}
        style={{
          maxWidth: width ?? '560px',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
        }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--color-border-subtle)' }}
        >
          <h2 id={titleId} className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--color-text-muted)] transition hover:bg-[var(--color-bg-surface-muted)] hover:text-[var(--color-text-primary)]"
            aria-label="Close"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-4 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {children}
        </div>

        {footer ? (
          <div
            className="flex shrink-0 justify-end gap-2 px-5 py-4"
            style={{ borderTop: '1px solid var(--color-border-subtle)' }}
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
