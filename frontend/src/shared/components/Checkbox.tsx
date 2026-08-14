import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type CheckboxProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, className, id, ...props }, ref) => {
    const checkboxId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <label htmlFor={checkboxId} className="inline-flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          id={checkboxId}
          type="checkbox"
          className={[
            'h-4 w-4 rounded outline-none transition',
            'border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]',
            'checked:border-[var(--color-brand)] checked:bg-[var(--color-brand)]',
            'indeterminate:border-[var(--color-brand)] indeterminate:bg-[var(--color-brand)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            className ?? '',
          ].join(' ')}
          style={{ accentColor: 'var(--color-brand)' }}
          {...props}
        />
        {label && (
          <span className="text-sm" style={{ color: 'var(--color-text-primary)' }}>
            {label}
          </span>
        )}
      </label>
    );
  },
);
Checkbox.displayName = 'Checkbox';
