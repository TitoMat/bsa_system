import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { DISPATCH_STRATEGIES } from '../domain/dispatch-domain';
import type { AssignmentStrategy } from '../domain/dispatch-domain';

export class UpdateDispatchSettingsDto {
  @IsOptional()
  @IsBoolean()
  autoDispatchEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  executiveReservationMode?: boolean;

  @IsOptional()
  @IsIn(DISPATCH_STRATEGIES)
  defaultAssignmentStrategy?: AssignmentStrategy;
}
