import {
  IsString,
  IsNotEmpty,
  IsInt,
  Min,
  IsUUID,
  IsISO8601,
} from 'class-validator';

export class CreateClassScheduleDto {
  @IsUUID()
  @IsNotEmpty()
  teacherId: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsISO8601()
  @IsNotEmpty()
  startTime: string;

  @IsISO8601()
  @IsNotEmpty()
  endTime: string;

  @IsInt()
  @Min(1)
  @IsNotEmpty()
  maxCapacity: number;
}
