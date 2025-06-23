import { IsInt, IsOptional, Min, IsDateString } from 'class-validator';

export class UpdateUserPackageDto {
  @IsInt()
  @Min(0)
  @IsOptional()
  remainingCredits?: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
