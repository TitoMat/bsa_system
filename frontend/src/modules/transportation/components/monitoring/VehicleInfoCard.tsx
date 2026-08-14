import type { VehicleMapFeature } from '../../types/fleetMapState.types';
import {
  VEHICLE_STATUS_ACCENT,
  VEHICLE_STATUS_LABELS,
} from '../../../maps/components/vehicleMarker';

export default function VehicleInfoCard({
  vehicle,
  onViewRequest,
  onClose,
}: {
  vehicle: VehicleMapFeature;
  onViewRequest?: () => void;
  onClose: () => void;
}) {
  const accent = VEHICLE_STATUS_ACCENT[vehicle.status];

  return (
    <div
      className="absolute left-3 top-14 z-20 flex max-w-[calc(100%-1.5rem)] items-center gap-3 rounded-lg border px-3 py-2 shadow-lg"
      style={{
        background: 'var(--color-bg-elevated)',
        borderColor: 'var(--color-border-subtle)',
      }}
    >
      <span
        className="inline-block h-7 w-7 shrink-0 rounded-full border-2"
        style={{ borderColor: accent }}
        aria-hidden
      />
      <div className="min-w-0">
        <div
          className="truncate text-xs font-semibold"
          style={{ color: 'var(--color-text-primary)' }}
          title={vehicle.label}
        >
          {vehicle.label}
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          <span
            className="rounded-full px-1.5 py-px font-semibold uppercase"
            style={{ background: `${accent}22`, color: accent }}
          >
            {VEHICLE_STATUS_LABELS[vehicle.status]}
          </span>
          {vehicle.driverName ? (
            <span className="truncate" title={vehicle.driverName}>
              {vehicle.driverName}
            </span>
          ) : (
            <span>No driver</span>
          )}
          {vehicle.requestNumber ? (
            <span className="truncate" title={vehicle.requestNumber}>
              {vehicle.requestNumber}
            </span>
          ) : null}
        </div>
      </div>
      {vehicle.requestId && onViewRequest ? (
        <button
          onClick={onViewRequest}
          className="shrink-0 rounded-md px-2.5 py-1.5 text-[10px] font-semibold text-white disabled:opacity-50"
          style={{ background: 'var(--color-brand)' }}
        >
          View Request
        </button>
      ) : null}
      <button
        onClick={onClose}
        aria-label="Close vehicle details"
        className="shrink-0 rounded px-1.5 py-1 text-[10px] font-semibold"
        style={{ color: 'var(--color-text-muted)' }}
      >
        ✕
      </button>
    </div>
  );
}