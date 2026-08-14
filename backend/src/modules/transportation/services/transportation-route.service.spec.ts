import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MapsService } from '../../maps/maps.service';
import { AuditService } from '../../../audit/audit.service';
import { TransportationRequest } from '../entities/transportation-request.entity';
import { TransportationRouteService } from './transportation-route.service';

const makeRequest = (overrides: Partial<TransportationRequest> = {}) =>
  ({
    id: 'req-1',
    requestNumber: 'TR-2026-0001',
    tripType: 'ONE_WAY',
    status: 'PENDING',
    pickupLatitude: 14.601,
    pickupLongitude: 121.011,
    destinationLatitude: 14.561,
    destinationLongitude: 121.041,
    estimatedDistanceMeters: null,
    estimatedDurationSeconds: null,
    routeGeometry: null,
    routeProvider: null,
    routeCalculatedAt: null,
    ...overrides,
  }) as TransportationRequest;

const mapsRoute = (overrides: Record<string, unknown> = {}) => ({
  route: {
    distanceMeters: 14800,
    durationSeconds: 1860,
    distanceLabel: '14.8 km',
    durationLabel: '31 min',
    provider: 'OSRM',
    geometry: { type: 'LineString', coordinates: [[121.011, 14.601]] },
    ...overrides,
  },
});

const ACTOR = { sub: 'user-1', email: 'user@bsa.local' };

describe('TransportationRouteService', () => {
  let service: TransportationRouteService;
  let requestRepo: { findOne: jest.Mock; save: jest.Mock };
  let mapsService: { calculateRoute: jest.Mock };
  let auditService: { log: jest.Mock };

  beforeEach(async () => {
    requestRepo = { findOne: jest.fn(), save: jest.fn() };
    mapsService = { calculateRoute: jest.fn() };
    auditService = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransportationRouteService,
        {
          provide: getRepositoryToken(TransportationRequest),
          useValue: requestRepo,
        },
        { provide: MapsService, useValue: mapsService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<TransportationRouteService>(
      TransportationRouteService,
    );
  });

  it('calculates and persists a route snapshot, then audits', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    mapsService.calculateRoute.mockResolvedValue(mapsRoute());

    const snapshot = await service.calculateForRequest('req-1', ACTOR);

    expect(mapsService.calculateRoute).toHaveBeenCalledWith({
      originLatitude: 14.601,
      originLongitude: 121.011,
      destinationLatitude: 14.561,
      destinationLongitude: 121.041,
      travelMode: 'car',
    });
    expect(snapshot).toMatchObject({
      distanceMeters: 14800,
      durationSeconds: 1860,
      provider: 'OSRM',
      geometry: { type: 'LineString', coordinates: [[121.011, 14.601]] },
    });
    expect(typeof snapshot.calculatedAt).toBe('string');
    expect(request.estimatedDistanceMeters).toBe(14800);
    expect(request.estimatedDurationSeconds).toBe(1860);
    expect(request.routeProvider).toBe('OSRM');
    expect(request.routeCalculatedAt).toBeInstanceOf(Date);
    expect(request.routeGeometry).toEqual({
      type: 'LineString',
      coordinates: [[121.011, 14.601]],
    });
    expect(requestRepo.save).toHaveBeenCalledWith(request);
    expect(auditService.log).toHaveBeenCalledWith({
      actorId: ACTOR.sub,
      actorEmail: ACTOR.email,
      action: 'TRANSPORTATION_ROUTE_CALCULATED',
      targetId: 'req-1',
    });
  });

  it('keeps the provider reported by the map service (Valhalla fallback)', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    mapsService.calculateRoute.mockResolvedValue(
      mapsRoute({ provider: 'Valhalla' }),
    );

    const snapshot = await service.calculateForRequest('req-1', ACTOR);

    expect(snapshot.provider).toBe('Valhalla');
    expect(request.routeProvider).toBe('Valhalla');
  });

  it('defaults to OSRM when the map service omits the provider', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    mapsService.calculateRoute.mockResolvedValue(
      mapsRoute({ provider: undefined }),
    );

    const snapshot = await service.calculateForRequest('req-1', ACTOR);

    expect(snapshot.provider).toBe('OSRM');
  });

  it('stores a null geometry when the map service returns none', async () => {
    const request = makeRequest();
    requestRepo.findOne.mockResolvedValue(request);
    mapsService.calculateRoute.mockResolvedValue(
      mapsRoute({ geometry: undefined }),
    );

    const snapshot = await service.calculateForRequest('req-1', ACTOR);

    expect(snapshot.geometry).toBeUndefined();
    expect(request.routeGeometry).toBeNull();
  });

  it('throws NotFoundException for an unknown request', async () => {
    requestRepo.findOne.mockResolvedValue(null);

    await expect(service.calculateForRequest('missing', ACTOR)).rejects.toThrow(
      NotFoundException,
    );
    expect(mapsService.calculateRoute).not.toHaveBeenCalled();
  });

  it('rejects a request with all-zero coordinates', async () => {
    requestRepo.findOne.mockResolvedValue(
      makeRequest({
        pickupLatitude: 0,
        pickupLongitude: 0,
        destinationLatitude: 0,
        destinationLongitude: 0,
      }),
    );

    await expect(service.calculateForRequest('req-1', ACTOR)).rejects.toThrow(
      BadRequestException,
    );
    expect(mapsService.calculateRoute).not.toHaveBeenCalled();
    expect(requestRepo.save).not.toHaveBeenCalled();
  });

  it('propagates map provider failures without saving or auditing', async () => {
    requestRepo.findOne.mockResolvedValue(makeRequest());
    mapsService.calculateRoute.mockRejectedValue(
      new Error('OSRM unavailable; Valhalla unavailable'),
    );

    await expect(service.calculateForRequest('req-1', ACTOR)).rejects.toThrow(
      'OSRM unavailable; Valhalla unavailable',
    );
    expect(requestRepo.save).not.toHaveBeenCalled();
    expect(auditService.log).not.toHaveBeenCalled();
  });
});
