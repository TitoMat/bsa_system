// Canonical interval-overlap primitive (R2 Step 9).
//
// Rule: intervals [existingStart, existingEnd) and [requestedStart,
// requestedEnd) OVERLAP when:
//
//     existingStart < requestedEnd AND existingEnd > requestedStart
//
// Both interval ends are treated as exclusive, so adjacent bookings never
// conflict:
//
//     10:00–11:00  and  11:00–12:00  →  NO CONFLICT

export function intervalsOverlap(
  existingStart: Date,
  existingEnd: Date,
  requestedStart: Date,
  requestedEnd: Date,
): boolean {
  return (
    existingStart.getTime() < requestedEnd.getTime() &&
    existingEnd.getTime() > requestedStart.getTime()
  );
}

/**
 * True when the existing interval fully contains the requested interval
 * (requestedStart >= existingStart AND requestedEnd <= existingEnd).
 * Used to answer "does the duty schedule cover the entire requested window?".
 */
export function intervalContains(
  containerStart: Date,
  containerEnd: Date,
  innerStart: Date,
  innerEnd: Date,
): boolean {
  return (
    containerStart.getTime() <= innerStart.getTime() &&
    containerEnd.getTime() >= innerEnd.getTime()
  );
}
