import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsBoolean,
  IsIn,
  IsDateString,
} from 'class-validator';
import {
  FLEET_ASSIGNMENT_POOLS,
  type FleetAssignmentPool,
} from '../../fleet-domain';

export class CreateDriverDto {
  @ApiProperty({
    example: 'Juan Dela Cruz',
    description: 'Full name of the driver',
  })
  @IsString()
  name!: string;

  @ApiProperty({ example: 'N01-12-345678', description: 'License number' })
  @IsString()
  licenseNumber!: string;

  @ApiPropertyOptional({
    example: '09171234567',
    description: 'Contact number',
  })
  @IsOptional()
  @IsString()
  contactNumber?: string;

  @ApiPropertyOptional({
    example: '123 Main St, Manila',
    description: 'Address',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Active status',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: '2027-01-01',
    description: 'License expiry date (YYYY-MM-DD)',
  })
  @IsOptional()
  @IsDateString()
  licenseExpiry?: string;

  @ApiPropertyOptional({
    example: 'GENERAL',
    description: 'Fleet assignment pool',
    enum: FLEET_ASSIGNMENT_POOLS,
    default: 'GENERAL',
  })
  @IsOptional()
  @IsIn(FLEET_ASSIGNMENT_POOLS)
  assignmentPool?: FleetAssignmentPool;

  @ApiPropertyOptional({
    example: true,
    description: 'May participate in automatic assignment',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  autoAssignEnabled?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'May enter the general pool when the executive is away (policy only)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowGeneralUseWhenExecutiveAway?: boolean;
}
