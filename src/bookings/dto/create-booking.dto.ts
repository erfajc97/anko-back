import { IsUUID, IsNotEmpty, IsEmail, IsOptional } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  classScheduleId: string;

  @IsEmail()
  @IsOptional()
  userEmail?: string; // Solo para admin
}
