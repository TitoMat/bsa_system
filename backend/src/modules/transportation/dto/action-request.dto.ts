import { IsOptional, IsString } from 'class-validator';

export class ApproveRequestDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class RejectRequestDto {
  @IsString()
  remarks!: string;
}

export class CancelRequestDto {
  @IsString()
  reason!: string;
}

export class CompleteRequestDto {
  @IsOptional()
  @IsString()
  remarks?: string;
}
