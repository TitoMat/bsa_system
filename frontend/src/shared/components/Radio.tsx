import type { InputHTMLAttributes } from 'react';
import { forwardRef } from 'react';

type RadioProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
};

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ label, className, id, ...props }, ref) => {
    const radioId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <label htmlFor={radioId} className="inline-flex items-center gap-2 cursor-pointer">
        <input
          ref={ref}
          id={radioId}
          type="radio"
          className={[
            'h-4 w-4 rounded-full outline-none transition',
            'border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]',
            'checked:border-[var(--color-brand)]',
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
Radio.displayName = 'Radio';
