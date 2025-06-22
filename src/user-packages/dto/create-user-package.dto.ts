import { IsUUID, IsNotEmpty, IsInt, Min } from 'class-validator';

export class CreateUserPackageDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsUUID()
  @IsNotEmpty()
  classPackageId: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  classesRemaining: number;
}
