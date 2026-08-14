import { PRIORITIES, PRIORITY_COLORS } from './types';
import type { TransportationPriority } from '../../types/transportation.types';

interface PriorityLegendProps {
  selected: TransportationPriority[];
  onToggle: (p: TransportationPriority) => void;
  eventCounts: Record<string, number>;
}

export function PriorityLegend({ selected, onToggle, eventCounts }: PriorityLegendProps) {
  return (
    <div className="space-y-1">
      {PRIORITIES.map((p) => {
        const active = selected.length === 0 || selected.includes(p);
        const count = eventCounts[p] ?? 0;
        const color = PRIORITY_COLORS[p];
        return (
          <button
            type="button"
            key={p}
            onClick={() => onToggle(p)}
            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition hover:opacity-80"
            style={{
              background: !active ? 'var(--color-bg-subtle)' : 'transparent',
              opacity: !active ? 0.45 : 1,
            }}
          >
            <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
            <span className="flex-1 capitalize" style={{ color: 'var(--color-text-primary)' }}>{p.toLowerCase()}</span>
            <span
              className="rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular-nums"
              style={{
                background: 'var(--color-bg-subtle)',
                color: count > 0 ? color : 'var(--color-text-muted)',
              }}
            >
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}