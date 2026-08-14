type LoadingStateProps = {
  message?: string;
  className?: string;
};

export function LoadingState({ message = 'Loading...', className }: LoadingStateProps) {
  return (
    <div
      className={['rounded-2xl border p-8 text-center text-sm', className].filter(Boolean).join(' ')}
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: 'var(--color-bg-surface-soft)',
        color: 'var(--color-text-muted)',
      }}
    >
      {message}
    </div>
  );
}
