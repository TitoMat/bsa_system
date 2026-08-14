import { intervalsOverlap, intervalContains } from './interval-overlap';

const at = (h: number): Date => new Date(Date.UTC(2026, 7, 12, h));

describe('intervalsOverlap (canonical overlap primitive)', () => {
  const requestedStart = at(10);
  const requestedEnd = at(12);

  it('false for no overlap (requested before existing)', () => {
    expect(intervalsOverlap(at(12), at(13), requestedStart, requestedEnd)).toBe(
      false,
    );
  });

  it('false for no overlap (requested after existing)', () => {
    expect(intervalsOverlap(at(8), at(10), requestedStart, requestedEnd)).toBe(
      false,
    );
  });

  it('true for partial overlap on the left', () => {
    expect(intervalsOverlap(at(9), at(11), requestedStart, requestedEnd)).toBe(
      true,
    );
  });

  it('true for partial overlap on the right', () => {
    expect(intervalsOverlap(at(11), at(13), requestedStart, requestedEnd)).toBe(
      true,
    );
  });

  it('true for full containment (existing inside requested)', () => {
    expect(
      intervalsOverlap(at(10.5), at(11.5), requestedStart, requestedEnd),
    ).toBe(true);
  });

  it('true for full containment (requested inside existing)', () => {
    expect(intervalsOverlap(at(9), at(13), requestedStart, requestedEnd)).toBe(
      true,
    );
  });

  it('true for exact match', () => {
    expect(intervalsOverlap(at(10), at(12), requestedStart, requestedEnd)).toBe(
      true,
    );
  });

  it('false for adjacency before (ends exclusive)', () => {
    expect(intervalsOverlap(at(8), at(10), requestedStart, requestedEnd)).toBe(
      false,
    );
  });

  it('false for adjacency after (ends exclusive)', () => {
    expect(intervalsOverlap(at(12), at(14), requestedStart, requestedEnd)).toBe(
      false,
    );
  });

  it('handles overnight intervals (00:00 next day)', () => {
    const overnightStart = new Date(Date.UTC(2026, 7, 12, 12));
    const overnightEnd = new Date(Date.UTC(2026, 7, 13, 1));
    expect(
      intervalsOverlap(overnightStart, overnightEnd, at(23.5), at(24)),
    ).toBe(true);
    expect(intervalsOverlap(overnightStart, overnightEnd, at(1), at(2))).toBe(
      false,
    );
  });

  it('is commutative', () => {
    expect(intervalsOverlap(at(9), at(11), requestedStart, requestedEnd)).toBe(
      intervalsOverlap(requestedStart, requestedEnd, at(9), at(11)),
    );
  });
});

describe('intervalContains', () => {
  it('true when existing interval fully contains requested', () => {
    expect(intervalContains(at(8), at(18), at(10), at(12))).toBe(true);
  });

  it('false when boundaries are equal but requested ends outside', () => {
    expect(intervalContains(at(8), at(12), at(10), at(13))).toBe(false);
  });

  it('false when requested starts before container starts', () => {
    expect(intervalContains(at(8), at(18), at(7), at(12))).toBe(false);
  });
});
