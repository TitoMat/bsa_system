import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { VEHICLE_BLOCK_REASONS } from '../domain/scheduling-domain';

export class UpdateVehicleAvailabilityBlockDto {
  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsEnum(VEHICLE_BLOCK_REASONS)
  reason?: (typeof VEHICLE_BLOCK_REASONS)[number];

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
