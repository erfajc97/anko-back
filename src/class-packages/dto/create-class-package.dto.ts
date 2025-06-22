import { IsString, IsNotEmpty, IsNumber, IsInt, Min } from 'class-validator';

export class CreateClassPackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  price: number;

  @IsInt()
  @Min(1)
  classCredits: number;

  @IsInt()
  @Min(1)
  validityDays: number;
}
