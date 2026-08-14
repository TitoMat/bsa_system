import { IsString, IsUUID, IsOptional, IsDateString } from 'class-validator';

export class CreateAssignmentDto {
  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  dispatchNotes?: string;

  @IsOptional()
  @IsDateString()
  expectedDepartureAt?: string;
}

export class AcceptAssignmentDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class DeclineAssignmentDto {
  @IsString()
  reason!: string;
}
