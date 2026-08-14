import type { CalendarEvent } from './types';
import { eventColor } from './types';

interface EventChipProps {
  event: CalendarEvent;
  onClick: (e: CalendarEvent) => void;
}

export function EventChip({ event, onClick }: EventChipProps) {
  const color = eventColor(event);
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className="block w-full truncate rounded px-1 py-0.5 text-left text-xs font-medium transition hover:opacity-80"
      style={{
        background: `${color}1F`,
        color,
        borderLeft: `3px solid ${color}`,
      }}
      title={`${event.title} — ${event.status}`}
    >
      {event.driver && (
        <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full" style={{ background: color }} />
      )}
      {event.title}
    </button>
  );
}