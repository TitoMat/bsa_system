import type { RouteGeometry, RouteResult } from '../../maps/types/maps.types';
import { formatDistance, formatDuration } from './boardFormatters';

/** Validate the persisted route snapshot geometry ({type:'LineString', coordinates:[[lat,lng],…]}). */
export function extractRouteGeometry(
  raw: Record<string, unknown> | undefined | null,
): RouteGeometry | null {
  if (!raw || typeof raw !== 'object') return null;
  const type = (raw as { type?: unknown }).type;
  const coords = (raw as { coordinates?: unknown }).coordinates;
  if (type !== 'LineString' || !Array.isArray(coords) || coords.length <= 1) return null;
  const valid = coords.every(
    (c) => Array.isArray(c) && c.length === 2 && c.every((n) => typeof n === 'number'),
  );
  if (!valid) return null;
  return { type: 'LineString', coordinates: coords as [number, number][] };
}

export function buildRouteResult(
  geometry: RouteGeometry,
  distanceMeters?: number | null,
  durationSeconds?: number | null,
): RouteResult {
  return {
    distanceMeters: distanceMeters ?? 0,
    durationSeconds: durationSeconds ?? 0,
    distanceLabel: formatDistance(distanceMeters),
    durationLabel: formatDuration(durationSeconds),
    geometry,
  };
}
