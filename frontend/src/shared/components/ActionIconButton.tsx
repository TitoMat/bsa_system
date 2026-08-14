import type { ReactNode } from 'react';

type ActionIconButtonProps = {
  title: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'default' | 'sky' | 'emerald' | 'red';
  children: ReactNode;
};

const TONE_CLASSES: Record<NonNullable<ActionIconButtonProps['tone']>, string> = {
  default: 'border-[var(--color-brand-soft)] bg-[var(--color-brand-softer)] text-[var(--color-text-primary)] hover:bg-[var(--color-brand-soft)]',
  sky: 'border-[var(--color-brand)] dark:border-[var(--color-brand)] bg-[var(--color-brand-soft)] dark:bg-[var(--color-brand)]/30 text-[var(--color-brand)] dark:text-[var(--color-brand)] hover:bg-[var(--color-brand-soft)] dark:hover:bg-[var(--color-brand)]/50',
  emerald: 'border-[var(--color-success-border)] dark:border-[var(--color-success-border)] bg-[var(--color-success-soft)] dark:bg-[var(--color-success)]/30 text-[var(--color-success)] dark:text-[var(--color-success)] hover:bg-[var(--color-success-soft)] dark:hover:bg-[var(--color-success)]/50',
  red: 'border-[var(--color-danger-border)] dark:border-[var(--color-danger-border)] bg-[var(--color-danger-soft)] dark:bg-[var(--color-danger)]/30 text-[var(--color-danger)] dark:text-[var(--color-danger)] hover:bg-[var(--color-danger-soft)] dark:hover:bg-[var(--color-danger)]/50',
};

export function ActionIconButton({
  title,
  onClick,
  disabled = false,
  tone = 'default',
  children,
}: ActionIconButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={[
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-xs transition',
        TONE_CLASSES[tone],
        disabled ? 'cursor-not-allowed opacity-45 hover:bg-transparent' : '',
      ].join(' ')}
    >
      {children}
    </button>
  );
}
