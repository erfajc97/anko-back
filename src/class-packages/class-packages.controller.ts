import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ClassPackagesService } from './class-packages.service';
import { CreateClassPackageDto } from './dto/create-class-package.dto';
import { UpdateClassPackageDto } from './dto/update-class-package.dto';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(AdminGuard)
@Controller('class-packages')
export class ClassPackagesController {
  constructor(private readonly classPackagesService: ClassPackagesService) {}

  @Post()
  create(@Body() createClassPackageDto: CreateClassPackageDto) {
    return this.classPackagesService.create(createClassPackageDto);
  }

  @Get()
  findAll() {
    return this.classPackagesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classPackagesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateClassPackageDto: UpdateClassPackageDto,
  ) {
    return this.classPackagesService.update(id, updateClassPackageDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.classPackagesService.remove(id);
  }
}
