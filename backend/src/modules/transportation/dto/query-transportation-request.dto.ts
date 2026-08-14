import { IsOptional, IsString, IsNumber, Min, Max } from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class QueryTransportationRequestDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  status?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  priority?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  requestType?: string[];

  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string' ? value.split(',') : value,
  )
  tripType?: string[];

  @IsOptional()
  @IsString()
  requesterId?: string;

  @IsOptional()
  @IsString()
  departmentId?: string;

  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  assigned?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  delayed?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true')
  activeOnly?: boolean;

  @IsOptional()
  @IsString()
  scheduledFrom?: string;

  @IsOptional()
  @IsString()
  scheduledTo?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt';

  @IsOptional()
  @Transform(({ value }) =>
    value === 'asc' || value === 'ASC' ? 'ASC' : 'DESC',
  )
  sortDirection?: 'ASC' | 'DESC' = 'DESC';
}
