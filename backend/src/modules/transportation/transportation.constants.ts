import { TransportationRequestStatus } from './entities/transportation-request.entity';

export const VALID_TRANSITIONS: Record<
  TransportationRequestStatus,
  TransportationRequestStatus[]
> = {
  DRAFT: ['SUBMITTED', 'APPROVED'],
  SUBMITTED: ['PENDING_APPROVAL'],
  PENDING_APPROVAL: ['APPROVED', 'REJECTED'],
  APPROVED: ['FOR_DISPATCH'],
  REJECTED: [],
  FOR_DISPATCH: ['DRIVER_ASSIGNED'],
  DRIVER_ASSIGNED: ['DRIVER_ACCEPTED', 'DRIVER_DECLINED'],
  DRIVER_ACCEPTED: ['EN_ROUTE_TO_PICKUP'],
  DRIVER_DECLINED: ['REASSIGNMENT_REQUIRED'],
  REASSIGNMENT_REQUIRED: ['DRIVER_ASSIGNED'],
  EN_ROUTE_TO_PICKUP: ['ARRIVED_AT_PICKUP', 'DELAYED'],
  ARRIVED_AT_PICKUP: ['PASSENGER_ONBOARD', 'NO_SHOW', 'DELAYED'],
  PASSENGER_ONBOARD: ['IN_TRANSIT', 'DELAYED'],
  IN_TRANSIT: ['ARRIVED_AT_DESTINATION', 'DELAYED'],
  ARRIVED_AT_DESTINATION: ['COMPLETED'],
  DELAYED: [
    'EN_ROUTE_TO_PICKUP',
    'ARRIVED_AT_PICKUP',
    'IN_TRANSIT',
    'ARRIVED_AT_DESTINATION',
  ],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
  VEHICLE_BREAKDOWN: ['REASSIGNMENT_REQUIRED'],
  INCIDENT_REPORTED: ['REASSIGNMENT_REQUIRED'],
};

export const FINAL_STATUSES: TransportationRequestStatus[] = [
  'COMPLETED',
  'CANCELLED',
  'REJECTED',
  'NO_SHOW',
];

export const CANCELLABLE_STATUSES: TransportationRequestStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'FOR_DISPATCH',
  'DRIVER_ASSIGNED',
  'DRIVER_ACCEPTED',
];

export function canTransition(
  from: TransportationRequestStatus,
  to: TransportationRequestStatus,
): boolean {
  if (FINAL_STATUSES.includes(from)) return false;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function isFinalStatus(status: TransportationRequestStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

export function isCancellable(status: TransportationRequestStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}

export const REQUEST_NUMBER_PREFIX = 'TR';
export const REQUEST_NUMBER_YEAR_LENGTH = 4;
export const REQUEST_NUMBER_SEQUENCE_LENGTH = 6;
