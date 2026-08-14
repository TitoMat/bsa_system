import {
  IsIn,
  IsDateString,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { DISPATCH_STRATEGIES } from '../domain/dispatch-domain';
import type { AssignmentStrategy } from '../domain/dispatch-domain';

export class ManualDispatchDto {
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

export class OverrideDispatchDto {
  @IsUUID()
  driverId!: string;

  @IsUUID()
  vehicleId!: string;

  @IsString()
  overrideReason!: string;

  @IsOptional()
  @IsIn(DISPATCH_STRATEGIES)
  assignmentStrategy?: AssignmentStrategy;
}

export class ReassignDispatchDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
