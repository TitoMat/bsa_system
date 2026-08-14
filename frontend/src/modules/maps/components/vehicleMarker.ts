import type {
  VehicleMapFeature,
  VehicleMapStatus,
} from '../../transportation/types/fleetMapState.types';

/**
 * R6 — Shared vehicle marker DOM for both map engines (MapLibre GL and the
 * Leaflet fallback). Colors ride the app theme tokens via CSS variables so
 * both light and dark themes render correctly without engine-specific code.
 *
 * Status → accent mapping (restrained, non-rainbow):
 *  - AVAILABLE   → brand   (teal)     — live location, no active assignment
 *  - ASSIGNED    → info    (teal-blue)— active assignment, pre-trip
 *  - ON_TRIP     → success (green)    — active assignment, in transit phases
 *  - MAINTENANCE → warning (amber)    — vehicle under maintenance
 *  - OFFLINE     → muted   (gray)     — out of service
 */
export const VEHICLE_STATUS_ACCENT: Record<VehicleMapStatus, string> = {
  AVAILABLE: 'var(--color-brand, #217279)',
  ASSIGNED: 'var(--color-info, #4BACB9)',
  ON_TRIP: 'var(--color-success, #0E9F6E)',
  MAINTENANCE: 'var(--color-warning, #B45309)',
  OFFLINE: 'var(--color-text-muted, #819394)',
};

export const VEHICLE_STATUS_LABELS: Record<VehicleMapStatus, string> = {
  AVAILABLE: 'Idle',
  ASSIGNED: 'Assigned',
  ON_TRIP: 'On trip',
  MAINTENANCE: 'Maintenance',
  OFFLINE: 'Out of service',
};

export const CAR_ICON_SVG = `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="%COLOR%" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 11l1.6-4.4A2 2 0 0 1 8.5 5h7a2 2 0 0 1 1.9 1.6L19 11"/><path d="M3 11h18a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1z"/><circle cx="7.5" cy="16.5" r="1.5"/><circle cx="16.5" cy="16.5" r="1.5"/></svg>`;

export function vehicleMarkerHtml(
  feature: VehicleMapFeature,
  emphasized: boolean,
): string {
  const accent = VEHICLE_STATUS_ACCENT[feature.status];
  const icon = CAR_ICON_SVG.replace('%COLOR%', accent);
  const ring = emphasized
    ? '0 0 0 3px rgba(255,255,255,0.9), 0 2px 10px rgba(0,0,0,0.45)'
    : '0 2px 6px rgba(0,0,0,0.35)';
  const scale = emphasized ? 'scale(1.12)' : 'scale(1)';
  const badge =
    feature.status === 'AVAILABLE' || feature.status === 'OFFLINE'
      ? ''
      : `<span style="position:absolute;top:-2px;right:-2px;width:9px;height:9px;border-radius:50%;border:2px solid var(--color-bg-elevated, #ffffff);background:${accent};"></span>`;

  return `<div class="bsa-vehicle-marker" data-vehicle-id="${feature.id}" data-status="${feature.status}" title="${feature.label} — ${VEHICLE_STATUS_LABELS[feature.status]}" style="cursor:pointer;display:flex;flex-direction:column;align-items:center;line-height:1">
  <div style="position:relative;width:32px;height:32px;border-radius:50%;background:var(--color-bg-elevated, #ffffff);border:2.5px solid ${accent};display:flex;align-items:center;justify-content:center;box-shadow:${ring};transform:${scale};transition:transform .12s ease">${icon}${badge}</div>
  <div style="margin-top:2px;padding:1px 5px;border-radius:4px;background:var(--color-bg-elevated, #ffffff);border:1px solid var(--color-border-subtle, rgba(0,0,0,0.15));font-size:9px;font-family:ui-monospace, SFMono-Regular, Menlo, monospace;font-weight:600;color:var(--color-text-primary, #183234);box-shadow:0 1px 3px rgba(0,0,0,0.2);text-align:center;max-width:96px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${feature.label}</div>
</div>`;
}