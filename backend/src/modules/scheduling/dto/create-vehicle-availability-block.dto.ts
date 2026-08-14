import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { VEHICLE_BLOCK_REASONS } from '../domain/scheduling-domain';

export class CreateVehicleAvailabilityBlockDto {
  @IsUUID()
  vehicleId!: string;

  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsEnum(VEHICLE_BLOCK_REASONS)
  reason!: (typeof VEHICLE_BLOCK_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
