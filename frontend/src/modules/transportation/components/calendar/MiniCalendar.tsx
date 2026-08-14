import { useMemo } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface MiniCalendarProps {
  currentMonth: dayjs.Dayjs;
  selectedDate: dayjs.Dayjs;
  onSelect: (d: dayjs.Dayjs) => void;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  eventDates?: string[];
}

export function MiniCalendar({
  currentMonth,
  selectedDate,
  onSelect,
  onPrevMonth,
  onNextMonth,
  eventDates,
}: MiniCalendarProps) {
  const weeks = useMemo(() => {
    const start = currentMonth.startOf('month').startOf('week');
    const rows: dayjs.Dayjs[][] = [];
    let day = start;
    for (let i = 0; i < 6; i++) {
      const week: dayjs.Dayjs[] = [];
      for (let j = 0; j < 7; j++) {
        week.push(day);
        day = day.add(1, 'day');
      }
      rows.push(week);
      if (day.month() !== currentMonth.month() && i >= 4) break;
    }
    return rows;
  }, [currentMonth]);

  const eventSet = useMemo(() => new Set(eventDates ?? []), [eventDates]);
  const today = dayjs().format('YYYY-MM-DD');

  return (
    <div
      className="rounded-xl border p-3 shadow-sm"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrevMonth}
          aria-label="Previous month"
          className="rounded p-1 transition hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {currentMonth.format('MMMM YYYY')}
        </span>
        <button
          type="button"
          onClick={onNextMonth}
          aria-label="Next month"
          className="rounded p-1 transition hover:opacity-70"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 text-center">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
          <div key={d} className="py-1 text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            {d}
          </div>
        ))}
        {weeks.map((week, wi) =>
          week.map((d, di) => {
            const fmt = d.format('YYYY-MM-DD');
            const isToday = fmt === today;
            const isSelected = fmt === selectedDate.format('YYYY-MM-DD');
            const isCurrentMonth = d.month() === currentMonth.month();
            const hasEvent = eventSet.has(fmt);
            return (
              <button
                type="button"
                key={`${wi}-${di}`}
                onClick={() => onSelect(d)}
                className="relative mx-auto flex h-7 w-7 items-center justify-center rounded-full text-xs transition"
                style={
                  isSelected
                    ? { background: 'var(--color-brand)', color: '#fff', fontWeight: 600 }
                    : isToday
                      ? {
                          background: 'color-mix(in srgb, var(--color-brand) 15%, transparent)',
                          color: 'var(--color-brand)',
                          fontWeight: 600,
                        }
                      : {
                          color: isCurrentMonth ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                          opacity: isCurrentMonth ? 1 : 0.4,
                        }
                }
              >
                {d.date()}
                {hasEvent && !isSelected && (
                  <span
                    className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                    style={{ background: 'var(--color-brand)' }}
                  />
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}