// Shared fleet domain concepts introduced in R1 (Driver + Vehicle normalization).
// Single canonical source for assignment-pool and coding-day semantics used by
// Driver, Car, their DTOs, and the migration. No scheduling logic lives here yet.

export type FleetAssignmentPool = 'GENERAL' | 'EXECUTIVE' | 'SPECIAL';

export const FLEET_ASSIGNMENT_POOLS = [
  'GENERAL',
  'EXECUTIVE',
  'SPECIAL',
] as const;

export const DEFAULT_ASSIGNMENT_POOL: FleetAssignmentPool = 'GENERAL';

export type CodingDay =
  | 'NONE'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY';

export const CODING_DAYS = [
  'NONE',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
] as const;

export const DEFAULT_CODING_DAY: CodingDay = 'NONE';

// Defaults for R1 eligibility fields (also enforced by the migration DDL):
// - autoAssignEnabled: true  -> resource MAY participate in future auto-assign
// - allowGeneralUseWhenExecutiveAway: false -> conservative safe default
export const DEFAULT_AUTO_ASSIGN_ENABLED = true;
export const DEFAULT_ALLOW_GENERAL_USE_WHEN_EXECUTIVE_AWAY = false;
