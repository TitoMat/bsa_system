import { deriveServiceWindow } from './service-window';

const req = (
  overrides: Partial<{
    tripType: string;
    scheduledPickupAt: Date;
    expectedEndAt: Date | null;
    expectedReturnAt: Date | null;
  }>,
) =>
  ({
    tripType: 'ONE_WAY',
    scheduledPickupAt: new Date('2026-08-12T01:00:00.000Z'),
    expectedEndAt: null,
    expectedReturnAt: null,
    ...overrides,
  }) as unknown as Parameters<typeof deriveServiceWindow>[0];

describe('deriveServiceWindow', () => {
  it('single trip: start = pickup, end = expectedEndAt', () => {
    const window = deriveServiceWindow(
      req({
        tripType: 'ONE_WAY',
        expectedEndAt: new Date('2026-08-12T04:00:00.000Z'),
      }),
    );
    expect(window.serviceStartAt.toISOString()).toBe(
      '2026-08-12T01:00:00.000Z',
    );
    expect(window.serviceEndAt.toISOString()).toBe('2026-08-12T04:00:00.000Z');
    expect(window.complete).toBe(true);
    expect(window.endSource).toBe('expectedEndAt');
  });

  it('round trip: start = outbound pickup, end = expectedEndAt (return completion)', () => {
    const window = deriveServiceWindow(
      req({
        tripType: 'ROUND_TRIP',
        expectedReturnAt: new Date('2026-08-12T06:00:00.000Z'),
        expectedEndAt: new Date('2026-08-12T08:00:00.000Z'),
      }),
    );
    expect(window.serviceStartAt.toISOString()).toBe(
      '2026-08-12T01:00:00.000Z',
    );
    expect(window.serviceEndAt.toISOString()).toBe('2026-08-12T08:00:00.000Z');
    expect(window.complete).toBe(true);
  });

  it('round trip: falls back to return pickup when expectedEndAt missing', () => {
    const window = deriveServiceWindow(
      req({
        tripType: 'ROUND_TRIP',
        expectedReturnAt: new Date('2026-08-12T06:00:00.000Z'),
      }),
    );
    expect(window.serviceEndAt.toISOString()).toBe('2026-08-12T06:00:00.000Z');
    expect(window.endSource).toBe('expectedReturnAt');
  });

  it('marks the window incomplete when no end is derivable', () => {
    const window = deriveServiceWindow(req({}));
    expect(window.complete).toBe(false);
  });

  it('marks the window incomplete when end is <= start', () => {
    const window = deriveServiceWindow(
      req({ expectedEndAt: new Date('2026-08-12T01:00:00.000Z') }),
    );
    expect(window.complete).toBe(false);
  });

  it('multi-stop uses the same derivation as single trip', () => {
    const window = deriveServiceWindow(
      req({
        tripType: 'MULTI_STOP',
        expectedEndAt: new Date('2026-08-12T05:00:00.000Z'),
      }),
    );
    expect(window.serviceEndAt.toISOString()).toBe('2026-08-12T05:00:00.000Z');
    expect(window.complete).toBe(true);
  });

  it('never uses estimatedDurationSeconds (no travel-time derivation in R2)', () => {
    const window = deriveServiceWindow(req({}));
    expect(window.complete).toBe(false);
  });
});
