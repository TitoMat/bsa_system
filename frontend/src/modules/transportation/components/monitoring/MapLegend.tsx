import { ROUTE_COLOR, PICKUP_COLOR, DESTINATION_COLOR } from '../../../maps/mapColors';
import type { FleetMapStateSummaryDto } from '../../types/fleetMapState.types';

export default function MapLegend({
  className = '',
  fleet,
  mapStateError = false,
  onRetry,
}: {
  className?: string;
  fleet?: FleetMapStateSummaryDto | null;
  mapStateError?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      className={`pointer-events-none absolute z-20 rounded-lg px-3 py-2 text-[10px] shadow-md ${className}`}
      style={{ background: 'var(--color-bg-surface)', border: '1px solid var(--color-border-subtle)' }}
    >
      <div className="flex items-center gap-2">
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: PICKUP_COLOR }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Pickup</span>
        <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: DESTINATION_COLOR, marginLeft: 6 }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Dropoff</span>
        <span className="inline-block h-1 w-4 rounded-sm" style={{ background: ROUTE_COLOR, marginLeft: 6 }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>Route</span>
        <span className="inline-block h-2 w-2 rounded-full border-2" style={{ borderColor: 'var(--color-brand)', marginLeft: 6 }} />
        <span style={{ color: 'var(--color-text-secondary)' }}>
          {fleet ? `${fleet.mappedVehicles}/${fleet.totalVehicles} vehicles` : 'Vehicle'}
        </span>
        {fleet && fleet.unlocatedVehicles > 0 && (
          <span
            className="rounded px-1.5 py-px font-semibold"
            style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)' }}
            title={`${fleet.unlocatedVehicles} vehicle${fleet.unlocatedVehicles === 1 ? '' : 's'} have no available location (no live driver feed)`}
          >
            {fleet.unlocatedVehicles} unlocated
          </span>
        )}
      </div>
      {mapStateError && (
        <div className="mt-1.5 flex items-center gap-2 pt-1.5" style={{ borderTop: '1px solid var(--color-border-subtle)' }}>
          <span style={{ color: 'var(--color-warning)' }}>Fleet map data unavailable</span>
          {onRetry && (
            <button
              onClick={onRetry}
              className="pointer-events-auto rounded border px-1.5 py-px font-semibold"
              style={{ borderColor: 'var(--color-warning-border)', color: 'var(--color-warning)' }}
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}