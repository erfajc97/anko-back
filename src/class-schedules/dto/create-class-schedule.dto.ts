import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';

export class CreateClassScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsDateString()
  startTime: string;

  @IsDateString()
  endTime: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  maxCapacity: number;
}
