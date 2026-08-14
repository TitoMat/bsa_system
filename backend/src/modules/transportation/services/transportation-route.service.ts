import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MapsService } from '../../maps/maps.service';
import { AuditService } from '../../../audit/audit.service';
import { TransportationRequest } from '../entities/transportation-request.entity';
import { NotFoundException } from '@nestjs/common';

export type RouteSnapshotResult = {
  distanceMeters: number;
  durationSeconds: number;
  provider: string;
  calculatedAt: string;
  geometry?: { type: string; coordinates: Array<[number, number]> };
};

/**
 * Route enrichment for a single Transportation Request (R3 Steps 3–5).
 *
 * Maps remains the source of route computation; this service only invokes the
 * existing MapsService and persists a HISTORICAL SNAPSHOT of the estimate
 * (distance / duration / provider / calculatedAt / geometry) onto the request.
 * The snapshot is what diagnostics and history render — the live route API
 * may return different values later.
 *
 * Deliberately NOT merged into TransportationService: the request lifecycle
 * and route enrichment are separate concerns. Route calculation can fail
 * independently (Maps temporarily unavailable) without failing the request.
 */
@Injectable()
export class TransportationRouteService {
  private readonly logger = new Logger(TransportationRouteService.name);

  constructor(
    @InjectRepository(TransportationRequest)
    private readonly requestRepo: Repository<TransportationRequest>,
    private readonly mapsService: MapsService,
    private readonly auditService: AuditService,
  ) {}

  async calculateForRequest(
    id: string,
    actor: { sub: string; email: string },
  ): Promise<RouteSnapshotResult> {
    const request = await this.requestRepo.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Transportation request "${id}" not found`);
    }

    if (
      request.pickupLatitude === 0 &&
      request.pickupLongitude === 0 &&
      request.destinationLatitude === 0 &&
      request.destinationLongitude === 0
    ) {
      throw new BadRequestException(
        'Request has no usable pickup/destination coordinates',
      );
    }

    const mapsRoute = await this.mapsService.calculateRoute({
      originLatitude: request.pickupLatitude,
      originLongitude: request.pickupLongitude,
      destinationLatitude: request.destinationLatitude,
      destinationLongitude: request.destinationLongitude,
      travelMode: 'car',
    });

    const snapshot: RouteSnapshotResult = {
      distanceMeters: mapsRoute.route.distanceMeters,
      durationSeconds: mapsRoute.route.durationSeconds,
      provider: mapsRoute.route.provider ?? 'OSRM',
      calculatedAt: new Date().toISOString(),
      geometry: mapsRoute.route.geometry,
    };

    request.estimatedDistanceMeters = snapshot.distanceMeters;
    request.estimatedDurationSeconds = snapshot.durationSeconds;
    request.routeGeometry = snapshot.geometry
      ? (snapshot.geometry as unknown as Record<string, unknown>)
      : null;
    request.routeProvider = snapshot.provider;
    request.routeCalculatedAt = new Date(snapshot.calculatedAt);
    await this.requestRepo.save(request);

    await this.auditService.log({
      actorId: actor.sub,
      actorEmail: actor.email,
      action: 'TRANSPORTATION_ROUTE_CALCULATED',
      targetId: request.id,
    });

    this.logger.log(
      `Route snapshot saved for request ${request.requestNumber}: ` +
        `${snapshot.distanceMeters}m / ${snapshot.durationSeconds}s via ${snapshot.provider}`,
    );

    return snapshot;
  }
}
