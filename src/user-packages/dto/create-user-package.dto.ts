import { IsUUID, IsNotEmpty, IsOptional, IsEmail } from 'class-validator';

export class CreateUserPackageDto {
  @IsUUID()
  @IsOptional()
  userId?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsUUID()
  @IsNotEmpty()
  classPackageId: string;
}
