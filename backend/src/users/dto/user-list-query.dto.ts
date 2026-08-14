// backend/src/users/dto/user-list-query.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { normalizeLimit, normalizePage } from '../../common/pagination';

export class UserListQueryDto {
  @ApiPropertyOptional({
    example: 1,
    minimum: 1,
    default: 1,
    description: 'Page number.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizePage(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 10,
    minimum: 10,
    maximum: 1000,
    default: 10,
    description: 'Items per page.',
  })
  @IsOptional()
  @Transform(({ value }) => normalizeLimit(value))
  @IsInt()
  @Min(10)
  @Max(1000)
  limit?: number = 10;

  @ApiPropertyOptional({
    example: 'maria',
    description: 'Search term for name or email.',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'ADMIN',
    description: 'Filter by role.',
  })
  @IsOptional()
  @IsString()
  role?: string;

  @ApiPropertyOptional({
    enum: ['ACTIVE', 'INACTIVE'],
    example: 'ACTIVE',
    description: 'Filter by account status.',
  })
  @IsOptional()
  @IsIn(['ACTIVE', 'INACTIVE'])
  status?: 'ACTIVE' | 'INACTIVE';
}
