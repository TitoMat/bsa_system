// backend/src/users/dto/update-user.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({
    example: 'Maria Santos',
    description: 'Updated display name for the user.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: 'maria.santos@example.com',
    description: 'Updated unique user email address.',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: 'ADMIN',
    description: 'Updated user role.',
  })
  @IsOptional()
  @IsString()
  role?: string;
}
