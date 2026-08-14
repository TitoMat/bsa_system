import type { ReactNode } from 'react';

type EmptyStateProps = {
  title?: string;
  message?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export function EmptyState({
  title = 'No records found',
  message = 'Try adjusting your search or filters.',
  icon,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={['rounded-2xl border border-dashed p-10 text-center', className].filter(Boolean).join(' ')}
      style={{
        borderColor: 'var(--color-border-default)',
        background: 'var(--color-bg-surface-soft)',
      }}
    >
      {icon && (
        <div className="mb-3 flex justify-center" style={{ color: 'var(--color-text-muted)' }}>
          {icon}
        </div>
      )}
      <p className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }}>
        {title}
      </p>
      {message && (
        <p className="mt-1 text-sm" style={{ color: 'var(--color-text-muted)' }}>
          {message}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
