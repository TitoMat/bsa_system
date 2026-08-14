// backend/src/users/dto/reset-password.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsStrongPassword } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({
    example: 'Str0ng!Pass1',
    description:
      'New password set by an administrator. Must be at least 10 characters with uppercase, lowercase, number, and symbol.',
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
