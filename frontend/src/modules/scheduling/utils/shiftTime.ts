function toMinutes(value: string): number {
  const [hours, minutes] = value.split(':').map((part) => Number(part));
  return hours * 60 + minutes;
}

export function isOvernightShift(shiftStart: string, shiftEnd: string): boolean {
  return toMinutes(shiftEnd) <= toMinutes(shiftStart);
}

export function shiftDurationHours(shiftStart: string, shiftEnd: string): number {
  const start = toMinutes(shiftStart);
  const end = toMinutes(shiftEnd);
  const duration = end > start ? end - start : end + 24 * 60 - start;
  return Math.round((duration / 60) * 10) / 10;
}

export function formatShift(shiftStart: string, shiftEnd: string): string {
  return isOvernightShift(shiftStart, shiftEnd)
    ? `${shiftStart} → ${shiftEnd} (+1d)`
    : `${shiftStart} → ${shiftEnd}`;
}

export function dayName(scheduleDate: string): string {
  const date = new Date(`${scheduleDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-PH', { weekday: 'short' });
}

export function formatDateShort(scheduleDate: string): string {
  const date = new Date(`${scheduleDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return scheduleDate;
  return date.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}