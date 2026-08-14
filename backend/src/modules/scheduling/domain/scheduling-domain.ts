// Scheduling + availability canonical domain for the BSA fleet.
//
// Timezone policy (R2):
// - The application operates on Asia/Manila local operational time. Frontend
//   sends `datetime-local` values converted via `new Date(...).toISOString()`
//   (an absolute instant); the backend stores `timestamptz`.
// - Schedule records keep LOCAL wall-clock pieces (`schedule_date` date +
//   `shift_start`/`shift_end` "HH:mm") because a shift's *calendar day* is a
//   local concept that must survive timezone changes. Concrete instants are
//   derived on read via resolveScheduleInterval().
// - Asia/Manila has had no DST since 1990; a fixed +08:00 offset is therefore
//   safe and deterministic. This is intentional and documented in the R2 report.

export const PHILIPPINE_TIME_OFFSET_MINUTES = 480;
export const PHILIPPINE_TIME_OFFSET_MS =
  PHILIPPINE_TIME_OFFSET_MINUTES * 60 * 1000;

// ─── Driver duty schedule statuses ────────────────────────────────────────────
//
// These describe the PLANNED day type on a driver duty schedule record. They
// intentionally differ from `drivers.duty_status` (a LIVE operational flag
// managed by dispatch): OFF_DUTY/ON_BREAK on the live flag are not schedule
// day types, and REST_DAY/UNAVAILABLE do not exist on the live flag.

export const DRIVER_DUTY_SCHEDULE_STATUSES = [
  'ON_DUTY',
  'REST_DAY',
  'LEAVE',
  'UNAVAILABLE',
] as const;

export type DriverDutyScheduleStatus =
  (typeof DRIVER_DUTY_SCHEDULE_STATUSES)[number];

// ─── Vehicle availability block reasons ──────────────────────────────────────

export const VEHICLE_BLOCK_REASONS = [
  'MAINTENANCE',
  'REPAIR',
  'LENT_OUT',
  'EXECUTIVE_RESERVED',
  'MANUAL_BLOCK',
  'OTHER',
] as const;

export type VehicleBlockReason = (typeof VEHICLE_BLOCK_REASONS)[number];

// ─── Availability result model ───────────────────────────────────────────────

export const DRIVER_AVAILABILITY_REASONS = [
  'DRIVER_NOT_FOUND',
  'DRIVER_INACTIVE',
  'AUTO_ASSIGN_DISABLED',
  'NO_DUTY_SCHEDULE',
  'OUTSIDE_SHIFT',
  'REST_DAY',
  'ON_LEAVE',
  'DRIVER_UNAVAILABLE',
  'LICENSE_EXPIRED',
] as const;

export type DriverAvailabilityReason =
  (typeof DRIVER_AVAILABILITY_REASONS)[number];

export const VEHICLE_AVAILABILITY_REASONS = [
  'VEHICLE_NOT_FOUND',
  'VEHICLE_INACTIVE',
  'AUTO_ASSIGN_DISABLED',
  'CAPACITY_INSUFFICIENT',
  'VEHICLE_BLOCKED',
  'UNDER_MAINTENANCE',
  'REGISTRATION_EXPIRED',
  'INSURANCE_EXPIRED',
  'CODING_RESTRICTION',
] as const;

export type VehicleAvailabilityReason =
  (typeof VEHICLE_AVAILABILITY_REASONS)[number];

// ─── R3 assignment-diagnostics exclusion reasons ─────────────────────────────
//
// R3 adds exactly ONE new canonical code: a candidate is excluded when an
// EXISTING non-terminal transportation request already occupies it during the
// requested service window (transitional source: transport_assignments —
// fleet_assignments do not exist until R4). The R2 availability reason
// vocabulary is reused verbatim for everything else.

export const DIAGNOSTIC_EXCLUSION_REASONS = [
  'EXISTING_REQUEST_CONFLICT',
] as const;

export type DiagnosticExclusionReason =
  (typeof DIAGNOSTIC_EXCLUSION_REASONS)[number];

export type AvailabilityResult<TReason extends string> = {
  available: boolean;
  reasons: TReason[];
  warnings: TReason[];
  evaluatedStartAt: string;
  evaluatedEndAt: string;
};

export function buildAvailabilityResult<TReason extends string>(
  evaluatedStartAt: Date,
  evaluatedEndAt: Date,
): {
  result: AvailabilityResult<TReason>;
  reasons: TReason[];
  warnings: TReason[];
} {
  const reasons: TReason[] = [];
  const warnings: TReason[] = [];
  return {
    result: {
      available: false,
      reasons,
      warnings,
      evaluatedStartAt: evaluatedStartAt.toISOString(),
      evaluatedEndAt: evaluatedEndAt.toISOString(),
    },
    reasons,
    warnings,
  };
}
