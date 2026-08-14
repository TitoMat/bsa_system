/**
 * R5B — Route snapshot freshness policy.
 *
 * Classifies a persisted R3 route snapshot by how long ago it was calculated.
 * Derived from routeCalculatedAt; no new database columns required.
 */

export type RouteFreshness = 'FRESH' | 'AGING' | 'STALE' | 'UNAVAILABLE';

const FRESH_THRESHOLD_MINUTES = 15;
const AGING_THRESHOLD_MINUTES = 30;

export function classifyRouteFreshness(
  routeCalculatedAt: Date | null,
): RouteFreshness {
  if (!routeCalculatedAt) return 'UNAVAILABLE';
  const ageMinutes =
    (Date.now() - new Date(routeCalculatedAt).getTime()) / 60_000;
  if (ageMinutes <= FRESH_THRESHOLD_MINUTES) return 'FRESH';
  if (ageMinutes <= AGING_THRESHOLD_MINUTES) return 'AGING';
  return 'STALE';
}
