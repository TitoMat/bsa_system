// backend/src/auth/dto/login.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, MinLength } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'admin@bsa.local',
    description: 'User email address.',
  })
  @IsEmail()
  email!: string;

  @ApiProperty({
    example: 'ChangeMe123',
    minLength: 6,
    description: 'User password.',
  })
  @MinLength(6)
  password!: string;
}
