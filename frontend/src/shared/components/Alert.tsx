import type { ReactNode } from 'react';

type AlertVariant = 'error' | 'success' | 'warning' | 'info';

type AlertProps = {
  variant: AlertVariant;
  message: string;
  icon?: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

const VARIANT_STYLES: Record<AlertVariant, { background: string; color: string; border: string }> = {
  error: { background: 'var(--color-danger-soft)', color: 'var(--color-danger)', border: 'var(--color-danger-border)' },
  success: { background: 'var(--color-success-soft)', color: 'var(--color-success)', border: 'var(--color-success-border)' },
  warning: { background: 'var(--color-warning-soft)', color: 'var(--color-warning)', border: 'var(--color-warning-border)' },
  info: { background: 'var(--color-info-soft)', color: 'var(--color-info)', border: 'var(--color-info-border)' },
};

export function Alert({ variant, message, icon, onDismiss, className }: AlertProps) {
  const s = VARIANT_STYLES[variant];
  return (
    <div
      className={['rounded-[10px] border px-4 py-3 text-sm', className].filter(Boolean).join(' ')}
      style={{ background: s.background, color: s.color, borderColor: s.border }}
    >
      <div className="flex items-start gap-2">
        {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
        <p className="flex-1">{message}</p>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 rounded-lg p-0.5 text-current opacity-60 transition hover:opacity-100"
            aria-label="Dismiss"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
