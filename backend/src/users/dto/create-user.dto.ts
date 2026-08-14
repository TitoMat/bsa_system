// backend/src/users/dto/create-user.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsStrongPassword,
} from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    example: 'Maria Santos',
    description: 'Display name for the user.',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    example: 'maria.santos@example.com',
    description: 'Unique user email address.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'Str0ng!Pass1',
    description:
      'Initial user password. Must be at least 10 characters with uppercase, lowercase, number, and symbol.',
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
  password!: string;

  @ApiProperty({
    example: 'USER',
    description: 'Role assigned to the user.',
  })
  @IsString()
  role!: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Whether the user account is active.',
  })
  @IsOptional()
  isActive?: boolean;
}
