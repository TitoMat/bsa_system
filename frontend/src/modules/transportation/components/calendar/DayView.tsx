import dayjs from 'dayjs';
import type { CalendarEvent } from './types';
import { eventColor, formatEventTime } from './types';

interface DayViewProps {
  date: dayjs.Dayjs;
  events: CalendarEvent[];
  onEventClick: (e: CalendarEvent) => void;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);

export function DayView({ date, events, onEventClick }: DayViewProps) {
  const dayEvents = events.filter((e) => dayjs(e.start).isSame(date, 'day'));
  const today = dayjs().format('YYYY-MM-DD');
  const isToday = date.format('YYYY-MM-DD') === today;

  function position(e: CalendarEvent): { top: number; height: number } {
    const start = dayjs(e.start);
    const end = dayjs(e.end);
    const st = start.hour() + start.minute() / 60;
    const et = end.hour() + end.minute() / 60;
    const top = (st / 24) * 100;
    const height = Math.max(((et - st) / 24) * 100, 2.5);
    return { top, height };
  }

  return (
    <div
      className="overflow-hidden rounded-2xl border shadow-sm"
      style={{ borderColor: 'var(--color-border-subtle)', background: 'var(--color-bg-surface)' }}
    >
      <div className="border-b p-4" style={{ borderColor: 'var(--color-border-subtle)' }}>
        <h3 className="text-lg font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {date.format('dddd, MMMM D, YYYY')}
        </h3>
      </div>
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        {HOURS.map((h) => {
          const hourEvents = dayEvents.filter((e) => dayjs(e.start).hour() === h);
          return (
            <div
              key={h}
              className="flex min-h-[56px] border-b"
              style={{ borderColor: 'var(--color-border-subtle)' }}
            >
              <div
                className="w-16 shrink-0 border-r py-1 pr-2 text-right text-[11px]"
                style={{
                  borderColor: 'var(--color-border-subtle)',
                  color: 'var(--color-text-muted)',
                }}
              >
                {h === 0 ? '' : dayjs().hour(h).minute(0).format('h A')}
              </div>
              <div
                className="relative flex-1"
                style={{
                  background: isToday
                    ? 'color-mix(in srgb, var(--color-brand) 3%, transparent)'
                    : 'transparent',
                }}
              >
                {hourEvents.map((e) => {
                  const pos = position(e);
                  return (
                    <button
                      type="button"
                      key={e.id}
                      onClick={() => onEventClick(e)}
                      className="absolute left-1 right-1 overflow-hidden rounded-lg p-2 text-left text-sm text-white transition hover:opacity-85"
                      style={{
                        top: `${pos.top}%`,
                        height: `${pos.height}%`,
                        background: eventColor(e),
                        minHeight: 40,
                      }}
                    >
                      <div className="truncate font-medium">{e.title}</div>
                      <div className="text-xs opacity-85">{formatEventTime(e.start, e.end)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}