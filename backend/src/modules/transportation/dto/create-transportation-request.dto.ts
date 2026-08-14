import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsArray,
  Min,
  Max,
  ValidateNested,
  IsDateString,
  IsLatitude,
  IsLongitude,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class TransportStopDto {
  @IsNumber()
  @Type(() => Number)
  sequence!: number;

  @IsString()
  address!: string;

  @IsLatitude()
  @Type(() => Number)
  latitude!: number;

  @IsLongitude()
  @Type(() => Number)
  longitude!: number;

  @IsOptional()
  @IsDateString()
  expectedArrivalAt?: string;

  @IsOptional()
  @IsString()
  purpose?: string;
}

export class TransportPassengerDto {
  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsString()
  passengerName!: string;

  @IsOptional()
  @IsString()
  contactNumber?: string;

  @IsOptional()
  @IsEnum(['EMPLOYEE', 'GUEST', 'VIP', 'VENDOR'])
  passengerType?: string = 'EMPLOYEE';

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateTransportationRequestDto {
  @IsEnum([
    'OFFICIAL_TRIP',
    'EMPLOYEE_TRANSPORT',
    'AIRPORT_TRANSFER',
    'DELIVERY',
    'EMERGENCY',
    'OTHER',
  ])
  requestType!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsEnum(['NORMAL', 'URGENT', 'EMERGENCY'])
  priority?: string = 'NORMAL';

  @IsEnum(['ONE_WAY', 'ROUND_TRIP', 'MULTI_STOP'])
  tripType!: string;

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

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  passengerCount!: number;

  @IsOptional()
  @IsString()
  preferredVehicleType?: string;

  @IsOptional()
  @IsEnum(['GENERAL', 'EXECUTIVE', 'SPECIAL'])
  requestedAssignmentPool?: string = 'GENERAL';

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsDateString()
  scheduledPickupAt!: string;

  @IsOptional()
  @IsDateString()
  expectedReturnAt?: string;

  @IsOptional()
  @IsDateString()
  expectedEndAt?: string;

  @IsString()
  pickupAddress!: string;

  @IsLatitude()
  @Type(() => Number)
  pickupLatitude!: number;

  @IsLongitude()
  @Type(() => Number)
  pickupLongitude!: number;

  @IsString()
  destinationAddress!: string;

  @IsLatitude()
  @Type(() => Number)
  destinationLatitude!: number;

  @IsLongitude()
  @Type(() => Number)
  destinationLongitude!: number;

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

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransportStopDto)
  stops?: TransportStopDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TransportPassengerDto)
  passengers?: TransportPassengerDto[];
}
