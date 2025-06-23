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
import { Public } from '../auth/decorators/public.decorator';

@Controller('class-packages')
export class ClassPackagesController {
  constructor(private readonly classPackagesService: ClassPackagesService) {}

  @Post()
  @UseGuards(AdminGuard)
  create(@Body() createClassPackageDto: CreateClassPackageDto) {
    return this.classPackagesService.create(createClassPackageDto);
  }

  @Public()
  @Get()
  findAll() {
    return this.classPackagesService.findAll();
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.classPackagesService.findOne(id);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  update(
    @Param('id') id: string,
    @Body() updateClassPackageDto: UpdateClassPackageDto,
  ) {
    return this.classPackagesService.update(id, updateClassPackageDto);
  }

  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.classPackagesService.remove(id);
  }
}
