import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { forwardRef } from 'react';

const inputBase =
  'h-10 w-full rounded-[8px] border px-3 text-sm outline-none transition placeholder:text-[var(--color-text-disabled)] disabled:cursor-not-allowed disabled:opacity-50 focus:border-[var(--color-brand)]';

const labelClass = 'mb-1.5 block text-sm font-medium text-[var(--color-text-secondary)]';
const errorClass = 'mt-1.5 text-xs text-[var(--color-danger)]';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, required, className, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && (
          <label htmlFor={inputId} className={labelClass}>
            {label}
            {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          required={required}
          className={[inputBase, className].filter(Boolean).join(' ')}
          style={{
            borderColor: error ? 'var(--color-danger)' : 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
          {...props}
        />
        {error && <p className={errorClass}>{error}</p>}
      </div>
    );
  },
);
Input.displayName = 'Input';

// --- Select ---

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: readonly { value: string; label: string }[];
  placeholder?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, required, options, placeholder, className, id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && (
          <label htmlFor={selectId} className={labelClass}>
            {label}
            {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          className={[inputBase, 'pr-8', className].filter(Boolean).join(' ')}
          style={{
            borderColor: error ? 'var(--color-danger)' : 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {error && <p className={errorClass}>{error}</p>}
      </div>
    );
  },
);
Select.displayName = 'Select';

// --- Textarea ---

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, required, className, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && (
          <label htmlFor={textareaId} className={labelClass}>
            {label}
            {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          className={[inputBase, 'min-h-28 resize-y py-2', className].filter(Boolean).join(' ')}
          style={{
            borderColor: error ? 'var(--color-danger)' : 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
          {...props}
        />
        {error && <p className={errorClass}>{error}</p>}
      </div>
    );
  },
);
Textarea.displayName = 'Textarea';

// --- DateInput ---

type DateInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  error?: string;
};

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
  ({ label, error, required, className, id, ...props }, ref) => {
    const dateId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
    return (
      <div>
        {label && (
          <label htmlFor={dateId} className={labelClass}>
            {label}
            {required && <span className="ml-1 text-[var(--color-danger)]">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={dateId}
          type="date"
          required={required}
          className={[inputBase, className].filter(Boolean).join(' ')}
          style={{
            borderColor: error ? 'var(--color-danger)' : 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
          {...props}
        />
        {error && <p className={errorClass}>{error}</p>}
      </div>
    );
  },
);
DateInput.displayName = 'DateInput';
