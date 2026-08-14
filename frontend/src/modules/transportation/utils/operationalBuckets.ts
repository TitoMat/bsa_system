/**
 * R5A — Operational status buckets derived from Transportation statuses.
 *
 * Maps the 22-state Transportation workflow into 7 user-facing operational
 * groups for the Dispatch Board. Single canonical mapping — never scatter
 * status checks across components.
 */
export const UNASSIGNED_STATUSES = new Set([
  'APPROVED',
  'FOR_DISPATCH',
  'DRIVER_DECLINED',
  'REASSIGNMENT_REQUIRED',
]);
export const ASSIGNED_STATUSES = new Set(['DRIVER_ASSIGNED', 'DRIVER_ACCEPTED']);
export const EN_ROUTE_STATUSES = new Set(['EN_ROUTE_TO_PICKUP']);
export const ON_TRIP_STATUSES = new Set([
  'ARRIVED_AT_PICKUP',
  'PASSENGER_ONBOARD',
  'IN_TRANSIT',
  'DELAYED',
]);
export const RETURNING_STATUSES = new Set(['ARRIVED_AT_DESTINATION']);
export const COMPLETED_STATUSES = new Set(['COMPLETED']);
export const ISSUE_STATUSES = new Set([
  'CANCELLED',
  'NO_SHOW',
  'VEHICLE_BREAKDOWN',
  'INCIDENT_REPORTED',
]);

export type OperationalBucket =
  | 'UNASSIGNED'
  | 'ASSIGNED'
  | 'EN_ROUTE'
  | 'ON_TRIP'
  | 'RETURNING'
  | 'COMPLETED'
  | 'ISSUES';

export function getOperationalBucket(status: string): OperationalBucket {
  if (UNASSIGNED_STATUSES.has(status)) return 'UNASSIGNED';
  if (ASSIGNED_STATUSES.has(status)) return 'ASSIGNED';
  if (EN_ROUTE_STATUSES.has(status)) return 'EN_ROUTE';
  if (ON_TRIP_STATUSES.has(status)) return 'ON_TRIP';
  if (RETURNING_STATUSES.has(status)) return 'RETURNING';
  if (COMPLETED_STATUSES.has(status)) return 'COMPLETED';
  return 'ISSUES';
}

export const BUCKET_LABELS: Record<OperationalBucket, string> = {
  UNASSIGNED: 'Need Assignment',
  ASSIGNED: 'Assigned',
  EN_ROUTE: 'En Route',
  ON_TRIP: 'On Trip',
  RETURNING: 'Returning',
  COMPLETED: 'Completed',
  ISSUES: 'Issues',
};

export const BUCKET_BADGE_COLORS: Record<OperationalBucket, { bg: string; text: string }> = {
  UNASSIGNED: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
  ASSIGNED: { bg: 'var(--color-brand-soft)', text: 'var(--color-brand)' },
  EN_ROUTE: { bg: 'var(--color-info-soft)', text: 'var(--color-info)' },
  ON_TRIP: { bg: 'var(--color-brand-soft)', text: 'var(--color-brand-active)' },
  RETURNING: { bg: 'var(--color-warning-soft)', text: 'var(--color-warning)' },
  COMPLETED: { bg: 'var(--color-success-soft)', text: 'var(--color-success)' },
  ISSUES: { bg: 'var(--color-danger-soft)', text: 'var(--color-danger)' },
};

export const BUCKET_SORT_ORDER: OperationalBucket[] = [
  'ISSUES',
  'UNASSIGNED',
  'EN_ROUTE',
  'ON_TRIP',
  'RETURNING',
  'ASSIGNED',
  'COMPLETED',
];