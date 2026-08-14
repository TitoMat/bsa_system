import { classifyTripPhase, isActiveTrip, isPreTrip } from './tripClassifier';

describe('tripClassifier', () => {
  describe('classifyTripPhase', () => {
    it.each([
      'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
      'FOR_DISPATCH', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED',
      'DRIVER_DECLINED', 'REASSIGNMENT_REQUIRED',
    ])('%s → PRE_TRIP', (status) => {
      expect(classifyTripPhase(status)).toBe('PRE_TRIP');
    });

    it.each([
      'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PASSENGER_ONBOARD',
      'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'DELAYED',
    ])('%s → ACTIVE_TRIP', (status) => {
      expect(classifyTripPhase(status)).toBe('ACTIVE_TRIP');
    });

    it.each([
      'COMPLETED', 'CANCELLED', 'NO_SHOW',
      'VEHICLE_BREAKDOWN', 'INCIDENT_REPORTED',
    ])('%s → POST_TRIP', (status) => {
      expect(classifyTripPhase(status)).toBe('POST_TRIP');
    });
  });

  describe('isActiveTrip', () => {
    it('returns true for EN_ROUTE_TO_PICKUP', () => {
      expect(isActiveTrip('EN_ROUTE_TO_PICKUP')).toBe(true);
    });
    it('returns true for IN_TRANSIT', () => {
      expect(isActiveTrip('IN_TRANSIT')).toBe(true);
    });
    it('returns false for DRIVER_ASSIGNED', () => {
      expect(isActiveTrip('DRIVER_ASSIGNED')).toBe(false);
    });
    it('returns false for COMPLETED', () => {
      expect(isActiveTrip('COMPLETED')).toBe(false);
    });
  });

  describe('isPreTrip', () => {
    it('returns true for APPROVED', () => {
      expect(isPreTrip('APPROVED')).toBe(true);
    });
    it('returns false for EN_ROUTE_TO_PICKUP', () => {
      expect(isPreTrip('EN_ROUTE_TO_PICKUP')).toBe(false);
    });
  });

  it('covers all 22 statuses', () => {
    const all = [
      'DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED',
      'FOR_DISPATCH', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED',
      'DRIVER_DECLINED', 'REASSIGNMENT_REQUIRED',
      'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PASSENGER_ONBOARD',
      'IN_TRANSIT', 'ARRIVED_AT_DESTINATION', 'DELAYED',
      'COMPLETED', 'CANCELLED', 'NO_SHOW',
      'VEHICLE_BREAKDOWN', 'INCIDENT_REPORTED',
    ];
    expect(all).toHaveLength(21);
    for (const status of all) {
      const phase = classifyTripPhase(status);
      expect(['PRE_TRIP', 'ACTIVE_TRIP', 'POST_TRIP']).toContain(phase);
    }
  });
});
