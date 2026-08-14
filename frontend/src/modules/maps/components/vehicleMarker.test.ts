import { describe, expect, it } from 'vitest';
import { CAR_ICON_SVG, vehicleMarkerHtml, VEHICLE_STATUS_LABELS } from './vehicleMarker';
import type { VehicleMapFeature } from '../../transportation/types/fleetMapState.types';

const feature: VehicleMapFeature = {
  id: 'car-9',
  label: 'ABC123',
  plateNumber: 'ABC123',
  vehicleStatus: 'OPERATIONAL',
  status: 'ASSIGNED',
  position: { latitude: 14.601, longitude: 121.011 },
  coordinate: [121.011, 14.601],
  locationSource: 'DRIVER_LOCATION',
  driverId: 'drv-1',
  driverName: 'D',
  requestId: 'req-1',
  requestNumber: 'TR-2026-0001',
  requestStatus: 'DRIVER_ASSIGNED',
};

describe('vehicleMarkerHtml', () => {
  it('embeds the vehicle id + status and uses theme CSS variables (engine-agnostic)', () => {
    const html = vehicleMarkerHtml(feature, false);
    expect(html).toContain('data-vehicle-id="car-9"');
    expect(html).toContain('data-status="ASSIGNED"');
    expect(html).toContain('var(--color-bg-elevated');
    expect(html).toContain('var(--color-info');
  });

  it('renders the label plate and status in the native tooltip', () => {
    const html = vehicleMarkerHtml(feature, false);
    expect(html).toContain('ABC123');
    expect(html).toContain(VEHICLE_STATUS_LABELS.ASSIGNED);
  });

  it('drops the status badge for AVAILABLE and OFF cars, shows it otherwise', () => {
    const free = vehicleMarkerHtml({ ...feature, status: 'AVAILABLE' }, false);
    expect(free).not.toContain('position:absolute;top:-2px');
    const maintenance = vehicleMarkerHtml({ ...feature, status: 'MAINTENANCE' }, false);
    expect(maintenance).toContain('position:absolute;top:-2px');
  });

  it('emphasizes the marker when selected/highlighted', () => {
    const normal = vehicleMarkerHtml(feature, false);
    const emphasized = vehicleMarkerHtml(feature, true);
    expect(normal).not.toContain('scale(1.12)');
    expect(emphasized).toContain('scale(1.12)');
  });

  it('exposes a car icon glyph', () => {
    expect(CAR_ICON_SVG).toContain('<svg');
  });
});