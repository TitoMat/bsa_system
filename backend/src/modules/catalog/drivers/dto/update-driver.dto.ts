import { ApiPropertyOptional } from '@nestjs/swagger';
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
import { DRIVER_DUTY_STATUSES, type DriverDutyStatus } from '../driver.entity';

export class UpdateDriverDto {
  @ApiPropertyOptional({
    example: 'Juan Dela Cruz',
    description: 'Full name of the driver',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'N01-12-345678',
    description: 'License number',
  })
  @IsOptional()
  @IsString()
  licenseNumber?: string;

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

  @ApiPropertyOptional({ example: true, description: 'Active status' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 'ON_DUTY',
    description: 'Duty status',
    enum: DRIVER_DUTY_STATUSES,
  })
  @IsOptional()
  @IsIn(DRIVER_DUTY_STATUSES)
  dutyStatus?: DriverDutyStatus;

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
  })
  @IsOptional()
  @IsIn(FLEET_ASSIGNMENT_POOLS)
  assignmentPool?: FleetAssignmentPool;

  @ApiPropertyOptional({
    example: true,
    description: 'May participate in automatic assignment',
  })
  @IsOptional()
  @IsBoolean()
  autoAssignEnabled?: boolean;

  @ApiPropertyOptional({
    example: false,
    description:
      'May enter the general pool when the executive is away (policy only)',
  })
  @IsOptional()
  @IsBoolean()
  allowGeneralUseWhenExecutiveAway?: boolean;
}
