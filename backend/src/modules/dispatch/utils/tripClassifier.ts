/**
 * R5B — Trip lifecycle classifier.
 *
 * Maps Transportation statuses into three operational phases:
 *   PRE_TRIP  — dispatch, assignment, driver response, waiting to depart
 *   ACTIVE_TRIP — physically in motion (en route, passenger onboard, in transit, returning)
 *   POST_TRIP — completed, cancelled, rejected, no-show
 */

const PRE_TRIP_STATUSES = new Set([
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'FOR_DISPATCH',
  'DRIVER_ASSIGNED',
  'DRIVER_ACCEPTED',
  'DRIVER_DECLINED',
  'REASSIGNMENT_REQUIRED',
]);

const ACTIVE_TRIP_STATUSES = new Set([
  'EN_ROUTE_TO_PICKUP',
  'ARRIVED_AT_PICKUP',
  'PASSENGER_ONBOARD',
  'IN_TRANSIT',
  'ARRIVED_AT_DESTINATION',
  'DELAYED',
]);

const POST_TRIP_STATUSES = new Set([
  'COMPLETED',
  'CANCELLED',
  'NO_SHOW',
  'VEHICLE_BREAKDOWN',
  'INCIDENT_REPORTED',
]);

export type TripPhase = 'PRE_TRIP' | 'ACTIVE_TRIP' | 'POST_TRIP';

export function classifyTripPhase(status: string): TripPhase {
  if (PRE_TRIP_STATUSES.has(status)) return 'PRE_TRIP';
  if (ACTIVE_TRIP_STATUSES.has(status)) return 'ACTIVE_TRIP';
  return 'POST_TRIP';
}

export function isActiveTrip(status: string): boolean {
  return ACTIVE_TRIP_STATUSES.has(status);
}

export function isPreTrip(status: string): boolean {
  return PRE_TRIP_STATUSES.has(status);
}
