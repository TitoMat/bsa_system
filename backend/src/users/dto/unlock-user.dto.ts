// backend/src/users/dto/unlock-user.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class UnlockUserDto {
  @ApiProperty({
    example: 'UnlockPass123',
    minLength: 8,
    description: 'New password assigned while unlocking the account.',
  })
  @IsString()
  @MinLength(8)
  newPassword!: string;
}
