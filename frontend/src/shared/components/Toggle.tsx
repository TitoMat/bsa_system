import { useId } from 'react';

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
};

export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  const id = useId();

  return (
    <label htmlFor={id} className="inline-flex items-center gap-2 cursor-pointer">
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200',
          'outline-none',
          'disabled:cursor-not-allowed disabled:opacity-50',
          checked ? 'bg-[var(--color-brand)]' : 'bg-[var(--color-border-strong)]',
        ].join(' ')}
      >
        <span
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
      {label && (
        <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </span>
      )}
    </label>
  );
}
