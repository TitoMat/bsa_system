import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { DRIVER_DUTY_SCHEDULE_STATUSES } from '../domain/scheduling-domain';
import type { DriverDutyScheduleStatus } from '../domain/scheduling-domain';

export class UpdateDriverDutyScheduleDto {
  @IsOptional()
  @IsDateString()
  scheduleDate?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'shiftStart must be "HH:mm" in 24h format',
  })
  shiftStart?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'shiftEnd must be "HH:mm" in 24h format',
  })
  shiftEnd?: string;

  @IsOptional()
  @IsEnum(DRIVER_DUTY_SCHEDULE_STATUSES)
  status?: DriverDutyScheduleStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
