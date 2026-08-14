import {
  resolveScheduleInterval,
  toLocalInstant,
  weekdayNameInPhilippines,
  isValidTimeFormat,
} from './shift-time';

describe('shift time model', () => {
  it('derives a normal same-day shift', () => {
    const interval = resolveScheduleInterval('2026-08-12', '07:30', '19:30');
    expect(interval.overnight).toBe(false);
    expect(interval.startAt.toISOString()).toBe('2026-08-11T23:30:00.000Z');
    expect(interval.endAt.toISOString()).toBe('2026-08-12T11:30:00.000Z');
    expect(interval.durationHours).toBe(12);
  });

  it('derives an overnight shift ending at 00:00 next day', () => {
    const interval = resolveScheduleInterval('2026-08-12', '12:00', '00:00');
    expect(interval.overnight).toBe(true);
    expect(interval.startAt.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    expect(interval.endAt.toISOString()).toBe('2026-08-12T16:00:00.000Z');
    expect(interval.durationHours).toBe(12);
  });

  it('derives an overnight shift ending at 02:00 next day', () => {
    const interval = resolveScheduleInterval('2026-08-12', '20:00', '02:00');
    expect(interval.overnight).toBe(true);
    expect(interval.endAt.toISOString()).toBe('2026-08-12T18:00:00.000Z');
    expect(interval.durationHours).toBe(6);
  });

  it('rejects zero-length shifts', () => {
    expect(() =>
      resolveScheduleInterval('2026-08-12', '00:00', '00:00'),
    ).toThrow(/zero-length/);
    expect(() =>
      resolveScheduleInterval('2026-08-12', '07:30', '07:30'),
    ).toThrow(/zero-length/);
  });

  it('rejects malformed times', () => {
    expect(() =>
      resolveScheduleInterval('2026-08-12', '25:00', '26:00'),
    ).toThrow(/Invalid shift time/);
    expect(() =>
      resolveScheduleInterval('2026-08-12', '7:30', '11:30'),
    ).toThrow(/Invalid shift time/);
  });

  it('validates the HH:mm pattern', () => {
    expect(isValidTimeFormat('00:00')).toBe(true);
    expect(isValidTimeFormat('23:59')).toBe(true);
    expect(isValidTimeFormat('24:00')).toBe(false);
    expect(isValidTimeFormat('7:30')).toBe(false);
  });

  it('converts a shift that crosses month boundaries (Aug 31 → Sep 1)', () => {
    const interval = resolveScheduleInterval('2026-08-31', '22:00', '06:00');
    expect(interval.endAt.toISOString()).toBe('2026-08-31T22:00:00.000Z');
    expect(interval.durationHours).toBe(8);
  });

  it('computes the Asia/Manila weekday of a concrete instant', () => {
    // 2026-08-12 is a Wednesday.
    expect(
      weekdayNameInPhilippines(toLocalInstant('2026-08-12', '12:00')),
    ).toBe('WEDNESDAY');
    // Just before midnight the same local weekday still applies.
    expect(
      weekdayNameInPhilippines(toLocalInstant('2026-08-12', '23:59')),
    ).toBe('WEDNESDAY');
  });
});
