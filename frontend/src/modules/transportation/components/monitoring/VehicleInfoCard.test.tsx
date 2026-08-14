import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VehicleInfoCard from './VehicleInfoCard';
import type { VehicleMapFeature } from '../../types/fleetMapState.types';

const feature: VehicleMapFeature = {
  id: 'car-1',
  label: 'NIN123',
  plateNumber: 'NIN123',
  vehicleStatus: 'OPERATIONAL',
  status: 'ON_TRIP',
  position: { latitude: 14.601, longitude: 121.011 },
  coordinate: [121.011, 14.601],
  locationSource: 'DRIVER_LOCATION',
  driverId: 'drv-1',
  driverName: 'Juan Dela Cruz',
  requestId: 'req-1',
  requestNumber: 'TR-2026-0001',
  requestStatus: 'IN_TRANSIT',
};

describe('VehicleInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows plate, status label, driver and request number', () => {
    render(<VehicleInfoCard vehicle={feature} onClose={() => {}} />);
    expect(screen.getByText('NIN123')).toBeInTheDocument();
    expect(screen.getByText(/ON TRIP|On trip/i)).toBeInTheDocument();
    expect(screen.getByText('Juan Dela Cruz')).toBeInTheDocument();
    expect(screen.getByText('TR-2026-0001')).toBeInTheDocument();
  });

  it('renders no request reference for vehicles without an assignment', () => {
    render(
      <VehicleInfoCard
        vehicle={{ ...feature, requestId: null, requestNumber: null, driverName: null }}
        onClose={() => {}}
      />,
    );
    expect(screen.queryByText('TR-2026-0001')).not.toBeInTheDocument();
    expect(screen.getByText('No driver')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'View Request' })).not.toBeInTheDocument();
  });

  it('calls onViewRequest and onClose', () => {
    const onViewRequest = vi.fn();
    const onClose = vi.fn();
    render(<VehicleInfoCard vehicle={feature} onViewRequest={onViewRequest} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'View Request' }));
    expect(onViewRequest).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Close vehicle details' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('exposes the full label as a native title tooltip', () => {
    render(<VehicleInfoCard vehicle={feature} onClose={() => {}} />);
    expect(screen.getByText('NIN123')).toHaveAttribute('title', 'NIN123');
  });
});