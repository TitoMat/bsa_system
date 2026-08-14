import dayjs from 'dayjs';
import type {
  TransportationPriority,
  TransportationRequest,
} from '../../types/transportation.types';

export type CalendarView = 'month' | 'week' | 'day' | 'agenda';

export interface CalendarEvent {
  id: string;
  requestNumber: string;
  title: string;
  start: string;
  end: string;
  priority: TransportationPriority;
  status: string;
  pickupAddress: string;
  destinationAddress: string;
  passengerCount: number;
  driver: string | null;
  vehicle: string | null;
}

export const PRIORITY_COLORS: Record<TransportationPriority, string> = {
  NORMAL: '#6B7280',
  URGENT: '#FEB15F',
  EMERGENCY: '#DA4531',
};

export const PRIORITIES: TransportationPriority[] = ['NORMAL', 'URGENT', 'EMERGENCY'];

export function toCalendarEvent(r: TransportationRequest): CalendarEvent {
  const start = r.scheduledPickupAt;
  const end =
    r.expectedReturnAt && dayjs(r.expectedReturnAt).isAfter(start)
      ? r.expectedReturnAt
      : dayjs(start).add(2, 'hour').toISOString();
  return {
    id: r.id,
    requestNumber: r.requestNumber,
    title: `${r.requestNumber}: ${r.title}`,
    start,
    end,
    priority: r.priority,
    status: r.status,
    pickupAddress: r.pickupAddress,
    destinationAddress: r.destinationAddress,
    passengerCount: r.passengerCount,
    driver: r.assignments?.[0]?.driver?.name ?? (r.assignedDriverId ? 'Assigned' : null),
    vehicle: r.assignments?.[0]?.vehicle?.plateNumber ?? (r.assignedVehicleId ? 'Assigned' : null),
  };
}

export function eventColor(e: CalendarEvent): string {
  return PRIORITY_COLORS[e.priority] ?? PRIORITY_COLORS.NORMAL;
}

export function formatEventTime(start: string, end: string): string {
  const s = dayjs(start);
  const e = dayjs(end);
  if (!e.isValid() || s.isSame(e, 'minute')) return s.format('h:mm A');
  if (s.isSame(e, 'day')) return `${s.format('h:mm A')} – ${e.format('h:mm A')}`;
  return `${s.format('MMM D, h:mm A')} – ${e.format('MMM D, h:mm A')}`;
}