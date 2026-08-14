import type { CalendarView } from './types';

const VIEWS: { value: CalendarView; label: string }[] = [
  { value: 'month', label: 'Month' },
  { value: 'week', label: 'Week' },
  { value: 'day', label: 'Day' },
  { value: 'agenda', label: 'Agenda' },
];

interface CalendarViewSwitcherProps {
  view: CalendarView;
  onChange: (v: CalendarView) => void;
}

export function CalendarViewSwitcher({ view, onChange }: CalendarViewSwitcherProps) {
  return (
    <div
      className="flex rounded-lg border p-0.5"
      style={{ borderColor: 'var(--color-border-default)', background: 'var(--color-bg-subtle)' }}
    >
      {VIEWS.map((v) => (
        <button
          type="button"
          key={v.value}
          onClick={() => onChange(v.value)}
          className="rounded-md px-3 py-1 text-sm font-medium transition"
          style={
            view === v.value
              ? { background: 'var(--color-brand)', color: '#fff' }
              : { color: 'var(--color-text-secondary)' }
          }
        >
          {v.label}
        </button>
      ))}
    </div>
  );
}