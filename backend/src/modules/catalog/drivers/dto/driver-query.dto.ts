import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { normalizeLimit, normalizePage } from '../../../../common/pagination';

export class DriverQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizePage(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => normalizeLimit(value))
  @IsInt()
  @Min(10)
  @Max(1000)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
