import { useMemo } from 'react';
import dayjs from 'dayjs';
import type { CalendarEvent } from './types';
import { eventColor } from './types';

interface WeekViewProps {
  currentDate: dayjs.Dayjs;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
  onDateClick: (d: dayjs.Dayjs) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function WeekView({ currentDate, events, onEventClick, onDateClick }: WeekViewProps) {
  const weekStart = currentDate.startOf('week');
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => weekStart.add(i, 'day')), [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = dayjs(e.start).format('YYYY-MM-DD');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  const timedFor = (day: dayjs.Dayjs): CalendarEvent[] =>
    eventsByDay.get(day.format('YYYY-MM-DD')) ?? [];

  const today = dayjs().format('YYYY-MM-DD');

  function position(e: CalendarEvent): { height: number } {
    const start = dayjs(e.start);
    const end = dayjs(e.end);
    const st = start.hour() + start.minute() / 60;
    const et = end.hour() + end.minute() / 60;
    const height = Math.max(((et - st) / 24) * 100, 2.5);
    return { height };
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
    >
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)] border-b"
        style={{ borderColor: 'var(--color-border-subtle)' }}
      >
        <div />
        {days.map((d) => {
          const isToday = d.format('YYYY-MM-DD') === today;
          return (
            <button
              type="button"
              key={d.format('YYYY-MM-DD')}
              onClick={() => onDateClick(d)}
              className="py-2 text-center transition hover:opacity-80"
            >
              <div className="text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
                {d.format('ddd')}
              </div>
              <div
                className="mx-auto mt-0.5 flex h-7 w-7 items-center justify-center rounded-full text-sm"
                style={{
                  background: isToday ? 'var(--color-brand)' : 'transparent',
                  color: isToday ? '#fff' : 'var(--color-text-primary)',
                  fontWeight: isToday ? 700 : 500,
                }}
              >
                {d.date()}
              </div>
            </button>
          );
        })}
      </div>
      <div
        className="grid grid-cols-[60px_repeat(7,1fr)] overflow-auto"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        {HOURS.map((h) => (
          <div key={h} className="contents">
            <div
              className="border-r border-b px-1 text-right text-[11px]"
              style={{
                borderColor: 'var(--color-border-subtle)',
                color: 'var(--color-text-muted)',
                height: 48,
                paddingTop: 2,
              }}
            >
              {h === 0 ? '' : dayjs().hour(h).minute(0).format('h A')}
            </div>
            {days.map((d) => {
              const isToday = d.format('YYYY-MM-DD') === today;
              const cellEvents = timedFor(d).filter((e) => dayjs(e.start).hour() === h);
              return (
                <div
                  key={d.format('YYYY-MM-DD')}
                  className="relative border-b border-r"
                  style={{
                    borderColor: 'var(--color-border-subtle)',
                    background: isToday ? 'color-mix(in srgb, var(--color-brand) 4%, transparent)' : 'transparent',
                    height: 48,
                  }}
                >
                  {cellEvents.map((e) => {
                    const pos = position(e);
                    return (
                      <button
                        type="button"
                        key={e.id}
                        onClick={() => onEventClick(e)}
                        className="absolute left-0.5 right-0.5 overflow-hidden rounded px-1 text-left text-[11px] leading-tight text-white transition hover:opacity-85"
                        style={{
                          top: 0,
                          height: `${pos.height}%`,
                          background: eventColor(e),
                        }}
                      >
                        <span className="font-medium">{e.title}</span>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}