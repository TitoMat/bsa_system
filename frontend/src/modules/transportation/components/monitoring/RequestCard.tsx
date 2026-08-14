import type { BoardRequest } from '../../api/transportation.api';
import { formatDistance, formatDuration, formatTime } from '../../utils/boardFormatters';

export default function RequestCard({
  request,
  selected,
  hovered,
  onSelect,
  onHover,
}: {
  request: BoardRequest;
  selected: boolean;
  hovered: boolean;
  onSelect: () => void;
  onHover: (hovered: boolean) => void;
}) {
  const attn = request.attention;

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      className="w-full border-b px-4 py-3 text-left transition"
      style={{
        borderColor: 'var(--color-border-subtle)',
        background: selected
          ? 'var(--color-brand-soft)'
          : hovered
            ? 'var(--color-bg-surface-muted)'
            : undefined,
        borderLeft: selected ? '3px solid var(--color-brand)' : '3px solid transparent',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {formatTime(request.scheduledPickupAt)}
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] font-medium" style={{ color: 'var(--color-text-muted)' }}>
            #{request.requestNumber}
          </span>
          {request.route?.freshness === 'STALE' && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}>STALE</span>
          )}
          {request.route?.freshness === 'AGING' && (
            <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ background: 'var(--color-info-soft)', color: 'var(--color-text-muted)' }}>AGING</span>
          )}
          {request.route && (
            <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              {formatDuration(request.route.durationSeconds)} · {formatDistance(request.route.distanceMeters)}
            </span>
          )}
        </div>
      </div>
      <div className="mt-0.5 text-sm font-medium truncate" style={{ color: 'var(--color-text-primary)' }}>
        {request.title || request.requestNumber}
      </div>
      <div className="mt-0.5 text-[11px] truncate" style={{ color: 'var(--color-text-muted)' }}>
        {request.pickup.address} → {request.destination.address}
      </div>
      <div className="mt-1.5 flex items-center flex-wrap gap-1.5">
        {request.assignment ? (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: 'var(--color-brand-soft)', color: 'var(--color-brand)' }}>
            {request.assignment.driver?.name ?? 'Driver'} · {request.assignment.vehicle?.plateNumber ?? 'Vehicle'}
          </span>
        ) : attn.required ? (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase" style={{
            background: attn.severity === 'CRITICAL' ? 'var(--color-danger-soft)' : 'var(--color-warning-soft)',
            color: attn.severity === 'CRITICAL' ? 'var(--color-danger)' : 'var(--color-warning)',
          }}>
            {attn.label ?? 'ATTENTION'}
          </span>
        ) : null}
        <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          {request.passengerCount}p · {request.requestType.replace(/_/g, ' ')}
        </span>
      </div>
    </button>
  );
}
