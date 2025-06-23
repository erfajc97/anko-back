import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsUUID,
  IsDateString,
  Matches,
} from 'class-validator';

export class CreateClassScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @Matches(/^\d{2}:\d{2}$/)
  startHour: string; // formato HH:mm

  @Matches(/^\d{2}:\d{2}$/)
  endHour: string; // formato HH:mm

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  maxCapacity: number;
}
