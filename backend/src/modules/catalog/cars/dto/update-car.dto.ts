import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsInt,
  IsIn,
  Min,
  IsDateString,
} from 'class-validator';
import {
  CODING_DAYS,
  FLEET_ASSIGNMENT_POOLS,
  type CodingDay,
  type FleetAssignmentPool,
} from '../../fleet-domain';
import { VEHICLE_STATUSES, type VehicleStatus } from '../car.entity';

const CAR_TYPES = [
  'Sedan',
  'SUV',
  'Van',
  'Truck',
  'Hatchback',
  'Coupe',
  'Wagon',
  'Other',
] as const;

export class UpdateCarDto {
  @ApiPropertyOptional({ example: 'Toyota', description: 'Car make/brand' })
  @IsOptional()
  @IsString()
  make?: string;

  @ApiPropertyOptional({ example: 'Vios', description: 'Car model' })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({ example: 2024, description: 'Manufacturing year' })
  @IsOptional()
  @IsInt()
  year?: number;

  @ApiPropertyOptional({ example: 'ABC 1234', description: 'Plate number' })
  @IsOptional()
  @IsString()
  plateNumber?: string;

  @ApiPropertyOptional({ example: 'White', description: 'Car color' })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiPropertyOptional({
    example: 'Sedan',
    description: 'Car type',
    enum: CAR_TYPES,
  })
  @IsOptional()
  @IsString()
  @IsIn(CAR_TYPES)
  carType?: string;

  @ApiPropertyOptional({ example: true, description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 5,
    description: 'Seating capacity',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  seatingCapacity?: number;

  @ApiPropertyOptional({
    example: 'OPERATIONAL',
    description: 'Vehicle status',
    enum: VEHICLE_STATUSES,
  })
  @IsOptional()
  @IsIn(VEHICLE_STATUSES)
  vehicleStatus?: VehicleStatus;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Registration expiry date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  registrationExpiry?: string;

  @ApiPropertyOptional({
    example: '2026-12-31',
    description: 'Insurance expiry date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  insuranceExpiry?: string;

  @ApiPropertyOptional({
    example: 'NONE',
    description: 'Coding day (stored policy only)',
    enum: CODING_DAYS,
  })
  @IsOptional()
  @IsIn(CODING_DAYS)
  codingDay?: CodingDay;

  @ApiPropertyOptional({
    example: 'GENERAL',
    description: 'Fleet assignment pool',
    enum: FLEET_ASSIGNMENT_POOLS,
  })
  @IsOptional()
  @IsIn(FLEET_ASSIGNMENT_POOLS)
  assignmentPool?: FleetAssignmentPool;

  @ApiPropertyOptional({
    example: true,
    description: 'May participate in automatic assignment',
  })
  @IsOptional()
  @IsBoolean()
  autoAssignEnabled?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'May enter the general pool when the executive is away (policy only)',
  })
  @IsOptional()
  @IsBoolean()
  allowGeneralUseWhenExecutiveAway?: boolean;
}
