import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { CalendarEvent } from './types';
import { eventColor, formatEventTime } from './types';

interface AgendaViewProps {
  startDate: dayjs.Dayjs;
  endDate: dayjs.Dayjs;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}

export function AgendaView({ startDate, endDate, events, onEventClick }: AgendaViewProps) {
  const grouped = useMemo(() => {
    const sorted = [...events].sort((a, b) => dayjs(a.start).valueOf() - dayjs(b.start).valueOf());
    const map = new Map<string, CalendarEvent[]>();
    for (const e of sorted) {
      const key = dayjs(e.start).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const days = useMemo(() => {
    const d: dayjs.Dayjs[] = [];
    let cursor = startDate.startOf('day');
    const end = endDate.startOf('day');
    while (cursor.isBefore(end) || cursor.isSame(end, 'day')) {
      d.push(cursor);
      cursor = cursor.add(1, 'day');
    }
    return d;
  }, [startDate, endDate]);

  const today = dayjs().format('YYYY-MM-DD');

  if (events.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center rounded-2xl border p-12 shadow-sm"
        style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
          No requests scheduled for this period.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border shadow-sm"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
    >
      {days.map((d) => {
        const fmt = d.format('YYYY-MM-DD');
        const dayEvents = grouped.get(fmt);
        if (!dayEvents) return null;
        const isToday = fmt === today;
        return (
          <div key={fmt}>
            <div
              className="sticky top-0 z-10 border-b px-4 py-2"
              style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
            >
              <span
                className="text-sm font-semibold"
                style={{ color: isToday ? 'var(--color-brand)' : 'var(--color-text-primary)' }}
              >
                {d.format('dddd, MMMM D, YYYY')}
              </span>
              {isToday && (
                <span
                  className="ml-2 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white"
                  style={{ background: 'var(--color-brand)' }}
                >
                  Today
                </span>
              )}
            </div>
            {dayEvents.map((e) => {
              const color = eventColor(e);
              return (
                <button
                  type="button"
                  key={e.id}
                  onClick={() => onEventClick(e)}
                  className="flex w-full items-start gap-3 border-b px-4 py-3 text-left transition hover:opacity-80"
                  style={{ borderColor: 'var(--color-border-subtle)' }}
                >
                  <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
                        {e.title}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: `${color}1F`, color }}
                      >
                        {e.priority}
                      </span>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ background: 'var(--color-bg-subtle)', color: 'var(--color-text-secondary)' }}
                      >
                        {e.status}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <span>{formatEventTime(e.start, e.end)}</span>
                      <span className="truncate">{e.pickupAddress} → {e.destinationAddress}</span>
                    </div>
                    {(e.driver || e.vehicle) && (
                      <div className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        {[e.driver, e.vehicle].filter(Boolean).join(' · ')}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}