// Shift time model (R2 Step 3).
//
// Shifts are stored as local wall-clock pieces: `scheduleDate` (YYYY-MM-DD) +
// `shiftStart`/`shiftEnd` ("HH:mm"). Overnight shifts are legal — shiftEnd may
// be <= shiftStart on the same calendar date. The CONCRETE service interval is
// derived with a fixed +08:00 (Asia/Manila, no DST) offset:
//
//   07:30 → 19:30  ⇒  Aug 12 07:30  → Aug 12 19:30  (+08:00)
//   12:00 → 00:00  ⇒  Aug 12 12:00  → Aug 13 00:00  (+08:00)
//
// Equal start/end times (00:00 → 00:00) would mean a zero-length shift and are
// rejected by the service layer; a full 24h "00:00 → 00:00" day-long shift is
// intentionally not representable in R2 (record two ON_DUTY records instead —
// recurring/full-day coverage is deferred to R4).

import { PHILIPPINE_TIME_OFFSET_MS } from './scheduling-domain';

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const WEEKDAY_NAMES = [
  'SUNDAY',
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
] as const;

export type WeekdayName = (typeof WEEKDAY_NAMES)[number];

export function isValidTimeFormat(time: string): boolean {
  return TIME_PATTERN.test(time);
}

export function isValidScheduleDate(date: string): boolean {
  if (!DATE_PATTERN.test(date)) return false;
  return !Number.isNaN(new Date(`${date}T00:00:00`).getTime());
}

/**
 * Interpret a local (Asia/Manila) YYYY-MM-DD + "HH:mm" pair as an absolute
 * instant. Uses the fixed +08:00 offset — see scheduling-domain.ts policy.
 */
export function toLocalInstant(dateYmd: string, timeHm: string): Date {
  const [year, month, day] = dateYmd.split('-').map(Number);
  const [hours, minutes] = timeHm.split(':').map(Number);
  return new Date(
    Date.UTC(year, month - 1, day, hours, minutes) - PHILIPPINE_TIME_OFFSET_MS,
  );
}

export type ResolvedScheduleInterval = {
  startAt: Date;
  endAt: Date;
  /** True when the shift crosses midnight (shiftEnd <= shiftStart). */
  overnight: boolean;
  /** Shift length in hours (e.g. 12:00 → 00:00 = 12). */
  durationHours: number;
};

/**
 * Derive the concrete service interval for a duty schedule record.
 * Throws when either time is malformed or the shift is zero-length.
 */
export function resolveScheduleInterval(
  scheduleDate: string,
  shiftStart: string,
  shiftEnd: string,
): ResolvedScheduleInterval {
  if (!isValidTimeFormat(shiftStart) || !isValidTimeFormat(shiftEnd)) {
    throw new Error(
      `Invalid shift time format: "${shiftStart}" → "${shiftEnd}"`,
    );
  }
  if (shiftStart === shiftEnd) {
    throw new Error(
      `Shift cannot be zero-length: "${shiftStart}" → "${shiftEnd}"`,
    );
  }

  const startAt = toLocalInstant(scheduleDate, shiftStart);
  // shiftEnd <= shiftStart ⇒ the end time belongs to the NEXT calendar day.
  const overnight = shiftEnd <= shiftStart;
  const endAt = toLocalInstant(
    addDays(scheduleDate, overnight ? 1 : 0),
    shiftEnd,
  );

  const durationMs = endAt.getTime() - startAt.getTime();
  return { startAt, endAt, overnight, durationHours: durationMs / 3_600_000 };
}

function addDays(dateYmd: string, days: number): string {
  const [year, month, day] = dateYmd.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Weekday (Asia/Manila) of a concrete instant, e.g. 'WEDNESDAY'. */
export function weekdayNameInPhilippines(instant: Date): WeekdayName {
  const shifted = new Date(instant.getTime() + PHILIPPINE_TIME_OFFSET_MS);
  return WEEKDAY_NAMES[shifted.getUTCDay()];
}
