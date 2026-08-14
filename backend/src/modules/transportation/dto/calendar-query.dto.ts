import { IsOptional, IsString } from 'class-validator';

export class CalendarQueryDto {
  @IsOptional()
  @IsString()
  from?: string;

  @IsOptional()
  @IsString()
  to?: string;
}