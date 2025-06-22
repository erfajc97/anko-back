import { IsUUID, IsNotEmpty } from 'class-validator';

export class CreateBookingDto {
  @IsUUID()
  @IsNotEmpty()
  classScheduleId: string;
}
