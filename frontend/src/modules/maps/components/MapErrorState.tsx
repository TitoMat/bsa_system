type MapErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export function MapErrorState({ message, onRetry }: MapErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-sm" style={{ color: "var(--color-text-primary)" }}>
        {message}
      </p>
      {onRetry ? (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border px-4 py-2 text-sm transition hover:bg-[var(--color-bg-surface-muted)]"
          style={{
            borderColor: "var(--color-border-default)",
            color: "var(--color-text-primary)",
          }}
        >
          Retry
        </button>
      ) : null}
    </div>
  );
}