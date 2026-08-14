import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { CalendarEvent } from './types';
import { EventChip } from './EventChip';

interface MonthViewProps {
  currentMonth: dayjs.Dayjs;
  selectedDate: dayjs.Dayjs;
  events: CalendarEvent[];
  onDateClick: (d: dayjs.Dayjs) => void;
  onEventClick: (e: CalendarEvent) => void;
}

export function MonthView({
  currentMonth,
  selectedDate,
  events,
  onDateClick,
  onEventClick,
}: MonthViewProps) {
  const weeks = useMemo(() => {
    const start = currentMonth.startOf('month').startOf('week');
    const rows: dayjs.Dayjs[][] = [];
    let cursor = start;
    for (let i = 0; i < 6; i++) {
      const week: dayjs.Dayjs[] = [];
      for (let j = 0; j < 7; j++) {
        week.push(cursor);
        cursor = cursor.add(1, 'day');
      }
      rows.push(week);
      if (cursor.month() !== currentMonth.month() && i >= 4) break;
    }
    return rows;
  }, [currentMonth]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = dayjs(e.start).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const today = dayjs().format('YYYY-MM-DD');
  const sel = selectedDate.format('YYYY-MM-DD');

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
    >
      <div
        className="grid grid-cols-7 border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div
            key={d}
            className="py-2 text-center text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--color-text-muted)' }}
          >
            {d}
          </div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((d, di) => {
            const fmt = d.format('YYYY-MM-DD');
            const isToday = fmt === today;
            const isSel = fmt === sel;
            const isCurrentMonth = d.month() === currentMonth.month();
            const dayEvents = eventsByDay.get(fmt) ?? [];
            const maxVisible = 3;
            const overflow = dayEvents.length - maxVisible;
            return (
              <div
                key={`${wi}-${di}`}
                onClick={() => onDateClick(d)}
                className="min-h-[100px] cursor-pointer border-b border-r p-1 transition hover:opacity-90"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  background: isSel
                    ? 'color-mix(in srgb, var(--color-brand) 8%, transparent)'
                    : isToday
                      ? 'var(--color-bg-subtle)'
                      : 'transparent',
                  opacity: isCurrentMonth ? 1 : 0.4,
                }}
              >
                <div className="mb-1 flex items-center justify-between px-1">
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                    style={{
                      background: isToday ? 'var(--color-brand)' : 'transparent',
                      color: isToday ? '#fff' : 'var(--color-text-secondary)',
                      fontWeight: isToday ? 700 : 500,
                    }}
                  >
                    {d.date()}
                  </span>
                  {dayEvents.length > 0 && (
                    <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
                      {dayEvents.length}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, maxVisible).map((e) => (
                    <EventChip key={e.id} event={e} onClick={onEventClick} />
                  ))}
                  {overflow > 0 && (
                    <span
                      className="block px-1 text-xs font-medium"
                      style={{ color: 'var(--color-text-muted)' }}
                    >
                      +{overflow} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}