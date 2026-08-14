import { ApiProperty } from '@nestjs/swagger';
import type { VehicleStatus } from '../../catalog/cars/car.entity';

/**
 * R6 — Fleet map state response envelope for the dispatch/monitoring map.
 *
 * Emitted locations are ALWAYS derived from a legitimate persisted source
 * (currently the assigned driver's current_latitude/current_longitude when
 * the vehicle has an ACTIVE fleet assignment and the values are valid).
 * Vehicles without a legitimate location are returned with
 * locationStatus: 'UNAVAILABLE' and location: null — never a synthetic
 * coordinate.
 */

export class FleetMapVehicleLocationDto {
  @ApiProperty({ example: 1.3521, description: 'WGS84 latitude' })
  latitude!: number;

  @ApiProperty({ example: 103.8198, description: 'WGS84 longitude' })
  longitude!: number;
}

export class FleetMapAssignmentDto {
  @ApiProperty() id!: string;
  @ApiProperty() requestId!: string;
  @ApiProperty({ nullable: true }) requestNumber!: string | null;
  @ApiProperty() driverId!: string;
  @ApiProperty({ nullable: true }) driverName!: string | null;
  @ApiProperty() requestStatus!: string;
  @ApiProperty({ nullable: true })
  scheduledPickupAt!: string | null;
}

export class FleetMapVehicleDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) plateNumber!: string | null;
  @ApiProperty({ nullable: true }) make!: string | null;
  @ApiProperty({ nullable: true }) model!: string | null;

  /** Canonical maintenance status — no presentation synonym normalization. */
  @ApiProperty({ enum: ['OPERATIONAL', 'MAINTENANCE', 'OUT_OF_SERVICE'] })
  vehicleStatus!: VehicleStatus;

  /** Coordinate of the vehicle when a legitimate persisted source exists. */
  @ApiProperty({ type: () => FleetMapVehicleLocationDto, nullable: true })
  location!: FleetMapVehicleLocationDto | null;

  @ApiProperty({
    enum: ['AVAILABLE', 'UNAVAILABLE'],
    description:
      'AVAILABLE only when a legitimate source emitted the location above.',
  })
  locationStatus!: 'AVAILABLE' | 'UNAVAILABLE';

  @ApiProperty({
    enum: ['DRIVER_LOCATION'],
    nullable: true,
    description: 'Legitimate source that produced the location, if any.',
  })
  locationSource!: 'DRIVER_LOCATION' | null;

  @ApiProperty({
    nullable: true,
    description:
      'ISO timestamp of source capture. Null when the source has no timestamp.',
  })
  locationUpdatedAt!: string | null;

  @ApiProperty({ type: () => FleetMapAssignmentDto, nullable: true })
  assignment!: FleetMapAssignmentDto | null;
}

export class FleetMapStateSummaryDto {
  @ApiProperty({ description: 'Active fleet vehicles in scope' })
  totalVehicles!: number;

  @ApiProperty({ description: 'Vehicles with a legitimate available location' })
  mappedVehicles!: number;

  @ApiProperty({ description: 'Vehicles without a legitimate source location' })
  unlocatedVehicles!: number;
}

export class FleetMapStateResponseDto {
  @ApiProperty({ type: () => [FleetMapVehicleDto] })
  vehicles!: FleetMapVehicleDto[];

  @ApiProperty({ type: () => FleetMapStateSummaryDto })
  summary!: FleetMapStateSummaryDto;

  @ApiProperty({ description: 'ISO timestamp of state generation' })
  generatedAt!: string;
}
