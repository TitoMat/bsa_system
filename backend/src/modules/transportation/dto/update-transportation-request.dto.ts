import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  Min,
  IsDateString,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateTransportationRequestDto {
  @IsOptional()
  @IsEnum([
    'OFFICIAL_TRIP',
    'EMPLOYEE_TRANSPORT',
    'AIRPORT_TRANSFER',
    'DELIVERY',
    'EMERGENCY',
    'OTHER',
  ])
  requestType?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsEnum(['NORMAL', 'URGENT', 'EMERGENCY'])
  priority?: string;

  @IsOptional()
  @IsEnum(['ONE_WAY', 'ROUND_TRIP', 'MULTI_STOP'])
  tripType?: string;

  @IsOptional()
  @IsString()
  requestorName?: string;

  @IsOptional()
  @IsString()
  requestorEmail?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  costCenter?: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  passengerCount?: number;

  @IsOptional()
  @IsString()
  preferredVehicleType?: string;

  @IsOptional()
  @IsEnum(['GENERAL', 'EXECUTIVE', 'SPECIAL'])
  requestedAssignmentPool?: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsDateString()
  scheduledPickupAt?: string;

  @IsOptional()
  @IsDateString()
  expectedReturnAt?: string;

  @IsOptional()
  @IsDateString()
  expectedEndAt?: string;

  @IsOptional()
  @IsString()
  pickupAddress?: string;

  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  pickupLatitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  pickupLongitude?: number;

  @IsOptional()
  @IsString()
  destinationAddress?: string;

  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  destinationLatitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  destinationLongitude?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedDistanceMeters?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  estimatedDurationSeconds?: number;

  @IsOptional()
  routeGeometry?: Record<string, unknown>;
}
