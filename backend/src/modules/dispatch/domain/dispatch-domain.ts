import type { FleetAssignmentPool } from '../../catalog/fleet-domain';

// ─── R4 Dispatch domain ──────────────────────────────────────────────────────
// Canonical assignment engine vocabulary shared by the engine, the API layer
// and the diagnostics read-model. No side effects live here.

export type { FleetAssignmentPool };

export type AssignmentMethod =
  | 'AUTOMATIC'
  | 'MANUAL'
  | 'OVERRIDE'
  | 'REASSIGNMENT';

export type AssignmentStrategy = 'FAIR_RANDOM' | 'PURE_RANDOM' | 'MANUAL';

export type FleetAssignmentStatus =
  | 'ACTIVE'
  | 'SUPERSEDED'
  | 'COMPLETED'
  | 'CANCELLED';

export const DEFAULT_ASSIGNMENT_STRATEGY: AssignmentStrategy = 'FAIR_RANDOM';

export const DISPATCH_STRATEGIES: AssignmentStrategy[] = [
  'FAIR_RANDOM',
  'PURE_RANDOM',
  'MANUAL',
];

export type DispatchResultStatus =
  | 'ASSIGNED'
  | 'ALREADY_ASSIGNED'
  | 'AUTO_DISPATCH_DISABLED'
  | 'REQUEST_NOT_DISPATCHABLE'
  | 'NO_ELIGIBLE_DRIVER'
  | 'NO_ELIGIBLE_VEHICLE'
  | 'NO_ELIGIBLE_PAIR'
  | 'CONFLICT_RETRY_EXHAUSTED'
  | 'VALIDATION_FAILED';

/**
 * Failure codes surfaced to dispatchers. Codes overlap with the R2/R3
 * availability vocabulary; the two dispatch-specific pool codes are R4.
 */
export type DispatchFailCode =
  | 'AUTO_ASSIGN_DISABLED'
  | 'ASSIGNMENT_POOL_MISMATCH'
  | 'EXECUTIVE_RESERVATION_POLICY'
  | 'INVALID_SERVICE_WINDOW'
  | 'DRIVER_NOT_FOUND'
  | 'VEHICLE_NOT_FOUND'
  | 'DRIVER_INACTIVE'
  | 'VEHICLE_INACTIVE'
  | 'NO_DUTY_SCHEDULE'
  | 'OUTSIDE_SHIFT'
  | 'REST_DAY'
  | 'ON_LEAVE'
  | 'DRIVER_UNAVAILABLE'
  | 'LICENSE_EXPIRED'
  | 'CAPACITY_INSUFFICIENT'
  | 'VEHICLE_BLOCKED'
  | 'UNDER_MAINTENANCE'
  | 'REGISTRATION_EXPIRED'
  | 'INSURANCE_EXPIRED'
  | 'CODING_RESTRICTION'
  | 'EXISTING_REQUEST_CONFLICT'
  | 'ACTIVE_FLEET_ASSIGNMENT_CONFLICT';

/**
 * R4 Step 22 — Overrideability matrix. Only these failures may be bypassed by
 * a manual override; everything else is a hard safety rule that no override
 * may bypass.
 */
const OVERRIDEABLE_CODES = new Set<DispatchFailCode>([
  'AUTO_ASSIGN_DISABLED',
  'ASSIGNMENT_POOL_MISMATCH',
  'EXECUTIVE_RESERVATION_POLICY',
]);

export function isOverrideableFailCode(code: DispatchFailCode): boolean {
  return OVERRIDEABLE_CODES.has(code);
}

export type AssignmentRef = {
  id: string;
  requestId: string;
  driverId: string;
  vehicleId: string;
  serviceStartAt: string;
  serviceEndAt: string;
  assignmentMethod: AssignmentMethod;
  assignmentStrategy: AssignmentStrategy;
  status: FleetAssignmentStatus;
  assignedAt: string;
};

export type DispatchDecision =
  | {
      ok: true;
      status: 'ASSIGNED';
      assignment: AssignmentRef;
      attempts: number;
    }
  | {
      ok: false;
      status: Exclude<DispatchResultStatus, 'ASSIGNED'>;
      failCode: DispatchFailCode | null;
      failures: string[];
      canOverride: boolean;
      attempts: number;
      assignment?: AssignmentRef | null;
    };

/**
 * R4 Steps 11–13 — Assignment pool policy.
 *
 * A request declares the pool it wants (default GENERAL). Resources in
 * requestedPool are always usable; EXECUTIVE resources may also serve GENERAL
 * requests only when the executive reservation mode is OFF (boss absent) AND
 * the resource itself opts in via allowGeneralUseWhenExecutiveAway.
 */
export function isResourceAllowedByPool(params: {
  resourcePool: FleetAssignmentPool;
  requestedPool: FleetAssignmentPool;
  executiveReservationMode: boolean;
  allowGeneralUseWhenExecutiveAway: boolean;
}): boolean {
  const {
    resourcePool,
    requestedPool,
    executiveReservationMode,
    allowGeneralUseWhenExecutiveAway,
  } = params;
  if (resourcePool === requestedPool) return true;
  if (requestedPool !== 'GENERAL') return false;
  if (executiveReservationMode) return false;
  return (
    resourcePool === 'EXECUTIVE' && allowGeneralUseWhenExecutiveAway === true
  );
}

/**
 * Human/machine-readable pool labels used in failures and UI copy.
 */
export const ASSIGNMENT_POOL_LABELS: Record<FleetAssignmentPool, string> = {
  GENERAL: 'GENERAL',
  EXECUTIVE: 'EXECUTIVE',
  SPECIAL: 'SPECIAL',
};
