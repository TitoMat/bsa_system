/**
 * R5B — Operational Exception Model.
 *
 * Typed codes and severities for Fleet Operations exceptions. Derived from
 * canonical state (R2 availability, R3 diagnostics, R4 dispatch results)
 * wherever possible. No separate exception persistence — these are computed
 * from existing data.
 */

export type ExceptionCode =
  | 'DRIVER_DECLINED'
  | 'DRIVER_UNAVAILABLE'
  | 'VEHICLE_UNAVAILABLE'
  | 'ASSIGNMENT_CONFLICT'
  | 'NO_ELIGIBLE_DRIVER'
  | 'NO_ELIGIBLE_VEHICLE'
  | 'NO_ELIGIBLE_PAIR'
  | 'REDISPATCH_REQUIRED'
  | 'REDISPATCH_FAILED'
  | 'ROUTE_UNAVAILABLE'
  | 'ROUTE_STALE'
  | 'ACTIVE_TRIP_RESOURCE_UNAVAILABLE';

export type ExceptionSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export const EXCEPTION_SEVERITY: Record<ExceptionCode, ExceptionSeverity> = {
  DRIVER_DECLINED: 'WARNING',
  DRIVER_UNAVAILABLE: 'WARNING',
  VEHICLE_UNAVAILABLE: 'WARNING',
  ASSIGNMENT_CONFLICT: 'CRITICAL',
  NO_ELIGIBLE_DRIVER: 'CRITICAL',
  NO_ELIGIBLE_VEHICLE: 'CRITICAL',
  NO_ELIGIBLE_PAIR: 'CRITICAL',
  REDISPATCH_REQUIRED: 'WARNING',
  REDISPATCH_FAILED: 'CRITICAL',
  ROUTE_UNAVAILABLE: 'WARNING',
  ROUTE_STALE: 'INFO',
  ACTIVE_TRIP_RESOURCE_UNAVAILABLE: 'CRITICAL',
};

export const EXCEPTION_LABELS: Record<ExceptionCode, string> = {
  DRIVER_DECLINED: 'Driver Declined',
  DRIVER_UNAVAILABLE: 'Driver Unavailable',
  VEHICLE_UNAVAILABLE: 'Vehicle Unavailable',
  ASSIGNMENT_CONFLICT: 'Assignment Conflict',
  NO_ELIGIBLE_DRIVER: 'No Eligible Driver',
  NO_ELIGIBLE_VEHICLE: 'No Eligible Vehicle',
  NO_ELIGIBLE_PAIR: 'No Eligible Pair',
  REDISPATCH_REQUIRED: 'Redispatch Required',
  REDISPATCH_FAILED: 'Redispatch Failed',
  ROUTE_UNAVAILABLE: 'Route Unavailable',
  ROUTE_STALE: 'Route Stale',
  ACTIVE_TRIP_RESOURCE_UNAVAILABLE: 'Active Trip — Resource Unavailable',
};

export const EXCEPTION_ACTION_LABELS: Partial<Record<ExceptionCode, string>> = {
  DRIVER_DECLINED: 'Redispatch',
  REDISPATCH_REQUIRED: 'Auto Redispatch',
  REDISPATCH_FAILED: 'Manual Reassign',
  ROUTE_UNAVAILABLE: 'Calculate Route',
  ROUTE_STALE: 'Refresh Route',
  ACTIVE_TRIP_RESOURCE_UNAVAILABLE: 'Manual Intervention Required',
};
