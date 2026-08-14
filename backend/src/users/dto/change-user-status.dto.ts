import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ChangeUserStatusDto {
  @ApiProperty({
    example: true,
    description: 'Whether the user account should be active.',
  })
  @IsBoolean()
  isActive!: boolean;
}
