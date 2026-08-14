import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

/**
 * Shared read-only availability evaluation input. Used as query params on
 * GET /fleet-availability/drivers/:id and GET /fleet-availability/cars/:id.
 */
export class CheckAvailabilityDto {
  @IsDateString()
  startAt!: string;

  @IsDateString()
  endAt!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  passengers?: number;
}
