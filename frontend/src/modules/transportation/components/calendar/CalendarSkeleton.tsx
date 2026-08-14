export function CalendarSkeleton() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="rounded-2xl border p-4 shadow-sm" style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-24 rounded-lg" style={{ background: 'var(--color-bg-subtle)' }} />
          ))}
        </div>
      </div>
    </div>
  );
}