import { Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CalendarView } from './types';
import { CalendarViewSwitcher } from './CalendarViewSwitcher';

interface CalendarToolbarProps {
  view: CalendarView;
  onViewChange: (v: CalendarView) => void;
  label: string;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onToday: () => void;
  onPrev: () => void;
  onNext: () => void;
  onNewRequest: () => void;
}

export function CalendarToolbar({
  view,
  onViewChange,
  label,
  searchQuery,
  onSearchChange,
  onToday,
  onPrev,
  onNext,
  onNewRequest,
}: CalendarToolbarProps) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onToday}
          className="rounded-lg border px-3 py-1.5 text-sm font-medium transition hover:opacity-80"
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
        >
          Today
        </button>
        <button
          type="button"
          onClick={onPrev}
          aria-label="Previous"
          className="rounded-lg border p-1.5 transition hover:opacity-80"
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ChevronLeft size={18} />
        </button>
        <button
          type="button"
          onClick={onNext}
          aria-label="Next"
          className="rounded-lg border p-1.5 transition hover:opacity-80"
          style={{
            borderColor: 'var(--color-border-default)',
            background: 'var(--color-bg-surface)',
            color: 'var(--color-text-secondary)',
          }}
        >
          <ChevronRight size={18} />
        </button>
        <h2 className="ml-1 text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {label}
        </h2>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <Search
            size={15}
            className="absolute left-2.5 top-1/2 -translate-y-1/2"
            style={{ color: 'var(--color-text-muted)' }}
          />
          <input
            type="text"
            placeholder="Search requests..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-9 w-48 rounded-lg border pl-8 pr-3 text-sm outline-none transition"
            style={{
              borderColor: 'var(--color-border-default)',
              background: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
            }}
          />
        </div>

        <CalendarViewSwitcher view={view} onChange={onViewChange} />

        <button
          type="button"
          onClick={onNewRequest}
          className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-white transition hover:opacity-90"
          style={{ background: 'var(--color-brand)' }}
        >
          <Plus size={16} />
          New Request
        </button>
      </div>
    </div>
  );
}