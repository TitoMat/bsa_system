import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Car } from '../../catalog/cars/car.entity';
import {
  FleetMapStateResponseDto,
  FleetMapVehicleDto,
} from '../dto/fleet-map-state.dto';

export type FleetMapStateRow = {
  v_id: string;
  v_plate: string | null;
  v_make: string | null;
  v_model: string | null;
  v_status: string;
  fa_id: string | null;
  fa_request_id: string | null;
  fa_driver_id: string | null;
  r_number: string | null;
  r_status: string | null;
  r_pickup_at: Date | null;
  d_name: string | null;
  d_lat: string | null;
  d_lng: string | null;
};

/**
 * R6 — Read-only aggregation of fleet vehicle state for the dispatch map.
 *
 * Location integrity: a vehicle is mapped ONLY when the assigned driver's
 * persisted current_latitude/current_longitude (source of truth for a
 * legitimate location) exists, is within valid WGS84 ranges, and the vehicle
 * currently has an ACTIVE fleet assignment. No synthetic coordinates are ever
 * emitted; results are deliberately immutable until a real source writes data.
 *
 * Single JOIN-based query — N+1 free (parity with getMonitoringBoard).
 */
@Injectable()
export class FleetMapStateService {
  constructor(
    @InjectRepository(Car) private readonly carRepo: Repository<Car>,
  ) {}

  async getMapState(): Promise<FleetMapStateResponseDto> {
    const rows = await this.carRepo
      .createQueryBuilder('v')
      .leftJoin(
        'fleet_assignments',
        'fa',
        "fa.vehicle_id = v.id AND fa.status = 'ACTIVE'",
      )
      .leftJoin(
        'transportation_requests',
        'r',
        'r.id = fa.transportation_request_id',
      )
      .leftJoin('drivers', 'd', 'd.id = fa.driver_id')
      .where('v.is_active = true')
      .select([
        'v.id AS v_id',
        'v.plate_number AS v_plate',
        'v.make AS v_make',
        'v.model AS v_model',
        'v.vehicle_status AS v_status',
        'fa.id AS fa_id',
        'fa.transportation_request_id AS fa_request_id',
        'fa.driver_id AS fa_driver_id',
        'r.request_number AS r_number',
        'r.status AS r_status',
        'r.scheduled_pickup_at AS r_pickup_at',
        'd.name AS d_name',
        'd.current_latitude AS d_lat',
        'd.current_longitude AS d_lng',
      ])
      .orderBy('v.plate_number', 'ASC')
      .getRawMany<FleetMapStateRow>();

    let mappedVehicles = 0;
    const vehicles: FleetMapVehicleDto[] = rows.map((row) => {
      const location = this.resolveLocation(row);
      if (location) {
        mappedVehicles += 1;
      }

      return {
        id: row.v_id,
        plateNumber: row.v_plate,
        make: row.v_make,
        model: row.v_model,
        vehicleStatus: row.v_status as FleetMapVehicleDto['vehicleStatus'],
        location: location
          ? { latitude: location.latitude, longitude: location.longitude }
          : null,
        locationStatus: location ? 'AVAILABLE' : 'UNAVAILABLE',
        locationSource: location ? 'DRIVER_LOCATION' : null,
        locationUpdatedAt: null,
        assignment: row.fa_id
          ? {
              id: row.fa_id,
              requestId: row.fa_request_id!,
              requestNumber: row.r_number,
              driverId: row.fa_driver_id!,
              driverName: row.d_name,
              requestStatus: row.r_status ?? '',
              scheduledPickupAt: row.r_pickup_at
                ? row.r_pickup_at.toISOString()
                : null,
            }
          : null,
      };
    });

    return {
      vehicles,
      summary: {
        totalVehicles: vehicles.length,
        mappedVehicles,
        unlocatedVehicles: vehicles.length - mappedVehicles,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Single legitimate location source (for now): the driver assigned to this
   * vehicle via an ACTIVE fleet assignment, using their persisted coordinates.
   */
  private resolveLocation(
    row: FleetMapStateRow,
  ): { latitude: number; longitude: number } | null {
    if (!row.fa_id || row.d_lat === null || row.d_lng === null) {
      return null;
    }
    const latitude = Number(row.d_lat);
    const longitude = Number(row.d_lng);
    if (
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude) ||
      latitude < -90 ||
      latitude > 90 ||
      longitude < -180 ||
      longitude > 180
    ) {
      return null;
    }
    return { latitude, longitude };
  }
}
