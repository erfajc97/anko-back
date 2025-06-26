import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ClassSchedulesService } from './class-schedules.service';
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';
import { UpdateClassScheduleDto } from './dto/update-class-schedule.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { Public } from '../auth/decorators/public.decorator';

@Controller('class-schedules')
export class ClassSchedulesController {
  constructor(private readonly classSchedulesService: ClassSchedulesService) {}

  @UseGuards(AdminGuard)
  @Post()
  create(@Body() createClassScheduleDto: CreateClassScheduleDto) {
    return this.classSchedulesService.create(createClassScheduleDto);
  }

  @UseGuards(AdminGuard)
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    return this.classSchedulesService.findAll(page, perPage);
  }

  @UseGuards(AdminGuard)
  @Get('available')
  findAvailableSchedules(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    return this.classSchedulesService.findAvailableSchedules(page, perPage);
  }

  @Public()
  @Get('calendar')
  findSchedulesByDateRange() {
    return this.classSchedulesService.findSchedulesByDateRange();
  }

  @UseGuards(AdminGuard)
  @Get('calendar/admin')
  findSchedulesByDateRangeForAdmin() {
    return this.classSchedulesService.findSchedulesByDateRangeForAdmin();
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classSchedulesService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClassScheduleDto: UpdateClassScheduleDto,
  ) {
    return this.classSchedulesService.update(id, updateClassScheduleDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classSchedulesService.remove(id);
  }
}
