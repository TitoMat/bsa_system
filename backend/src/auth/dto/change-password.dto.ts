// backend/src/auth/dto/change-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsStrongPassword } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    example: 'CurrentPass123',
    description: 'Current password for the authenticated user.',
  })
  @IsString()
  currentPassword!: string;

  @ApiProperty({
    example: 'NewStr0ng!Pass',
    description:
      'New password. Must be at least 10 characters with uppercase, lowercase, number, and symbol.',
  })
  @IsString()
  @IsStrongPassword(
    {
      minLength: 10,
      minLowercase: 1,
      minUppercase: 1,
      minNumbers: 1,
      minSymbols: 1,
    },
    {
      message:
        'Password must be at least 10 characters and include uppercase, lowercase, number, and symbol.',
    },
  )
  newPassword!: string;
}
