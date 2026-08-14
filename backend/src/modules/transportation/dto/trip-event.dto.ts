import {
  IsString,
  IsEnum,
  IsOptional,
  IsLatitude,
  IsLongitude,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTripEventDto {
  @IsEnum([
    'ASSIGNMENT_ACCEPTED',
    'ASSIGNMENT_DECLINED',
    'EN_ROUTE_TO_PICKUP',
    'ARRIVED_AT_PICKUP',
    'PASSENGER_ONBOARD',
    'TRIP_STARTED',
    'STOP_ARRIVAL',
    'DESTINATION_ARRIVAL',
    'TRIP_COMPLETED',
    'DELAY_REPORTED',
    'INCIDENT_REPORTED',
    'VEHICLE_PROBLEM_REPORTED',
  ])
  eventType!: string;

  @IsOptional()
  @IsString()
  assignmentId?: string;

  @IsOptional()
  @IsDateString()
  occurredAt?: string;

  @IsOptional()
  @IsLatitude()
  @Type(() => Number)
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  @Type(() => Number)
  longitude?: number;

  @IsOptional()
  @IsString()
  remarks?: string;
}
