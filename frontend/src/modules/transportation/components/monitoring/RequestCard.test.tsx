import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequestCard from './RequestCard';
import type { BoardRequest } from '../../api/transportation.api';

const request: BoardRequest = {
  id: 'req-1',
  requestNumber: 'TR-2026-0001',
  title: 'Executive to BGC',
  purpose: null,
  status: 'IN_TRANSIT',
  priority: 'HIGH',
  tripType: 'ONE_WAY',
  passengerCount: 3,
  requestType: 'EXECUTIVE',
  operationalBucket: 'ON_TRIP',
  temporalBucket: 'ACTIVE',
  tripPhase: 'ON_TRIP',
  attention: { required: false, severity: null, code: null, label: null, action: null },
  scheduledPickupAt: '2026-08-13T01:00:00.000Z',
  expectedEndAt: '2026-08-13T02:00:00.000Z',
  expectedReturnAt: null,
  pickup: { address: 'Pasig City', latitude: 14.601, longitude: 121.011 },
  destination: { address: 'BGC', latitude: 14.551, longitude: 121.011 },
  requestedAssignmentPool: 'GENERAL',
  route: null,
  assignment: null,
};

describe('RequestCard', () => {
  it('surfaces the request number visibly in the card header', () => {
    render(
      <RequestCard
        request={request}
        selected={false}
        hovered={false}
        onSelect={() => {}}
        onHover={() => {}}
      />,
    );
    expect(screen.getByText('#TR-2026-0001')).toBeInTheDocument();
  });

  it('renders title and route line', () => {
    render(
      <RequestCard
        request={request}
        selected={false}
        hovered={false}
        onSelect={() => {}}
        onHover={() => {}}
      />,
    );
    expect(screen.getByText('Executive to BGC')).toBeInTheDocument();
    expect(screen.getByText(/Pasig City → BGC/)).toBeInTheDocument();
  });
});