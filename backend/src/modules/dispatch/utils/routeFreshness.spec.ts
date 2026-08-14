import { classifyRouteFreshness } from './routeFreshness';

describe('routeFreshness', () => {
  it('returns UNAVAILABLE for null', () => {
    expect(classifyRouteFreshness(null)).toBe('UNAVAILABLE');
  });

  it('returns FRESH when <= 15 minutes ago', () => {
    const now = new Date();
    const recent = new Date(now.getTime() - 5 * 60_000);
    expect(classifyRouteFreshness(recent)).toBe('FRESH');
  });

  it('returns FRESH exactly at 15 minutes', () => {
    const now = new Date();
    const atThreshold = new Date(now.getTime() - 15 * 60_000);
    expect(classifyRouteFreshness(atThreshold)).toBe('FRESH');
  });

  it('returns AGING when > 15 and <= 30 minutes ago', () => {
    const now = new Date();
    const aging = new Date(now.getTime() - 20 * 60_000);
    expect(classifyRouteFreshness(aging)).toBe('AGING');
  });

  it('returns AGING exactly at 30 minutes', () => {
    const now = new Date();
    const atThreshold = new Date(now.getTime() - 30 * 60_000);
    expect(classifyRouteFreshness(atThreshold)).toBe('AGING');
  });

  it('returns STALE when > 30 minutes ago', () => {
    const now = new Date();
    const stale = new Date(now.getTime() - 45 * 60_000);
    expect(classifyRouteFreshness(stale)).toBe('STALE');
  });

  it('returns STALE for a timestamp > 24 hours ago', () => {
    const now = new Date();
    const veryOld = new Date(now.getTime() - 25 * 60 * 60_000);
    expect(classifyRouteFreshness(veryOld)).toBe('STALE');
  });

  it('handles the edge at just over 30 minutes', () => {
    const now = new Date();
    const justOver = new Date(now.getTime() - 30 * 60_000 - 1);
    expect(classifyRouteFreshness(justOver)).toBe('STALE');
  });

  it('handles the edge at just over 15 minutes', () => {
    const now = new Date();
    const justOver = new Date(now.getTime() - 15 * 60_000 - 1);
    expect(classifyRouteFreshness(justOver)).toBe('AGING');
  });
});
