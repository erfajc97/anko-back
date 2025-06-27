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
  Request,
} from '@nestjs/common';
import { UserPackagesService } from './user-packages.service';
import { CreateUserPackageDto } from './dto/create-user-package.dto';
import { UpdateUserPackageDto } from './dto/update-user-package.dto';
import { AdminGuard } from '../auth/guards/admin.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('user-packages')
export class UserPackagesController {
  constructor(private readonly userPackagesService: UserPackagesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Request() req, @Body() createUserPackageDto: CreateUserPackageDto) {
    return this.userPackagesService.create(req.user, createUserPackageDto);
  }

  @UseGuards(AdminGuard)
  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    return this.userPackagesService.findAll(page, perPage);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-packages')
  findMyPackages(@Request() req) {
    return this.userPackagesService.findAllByUserSorted(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my-available-classes')
  getMyAvailableClasses(@Request() req) {
    return this.userPackagesService.getAvailableClasses(req.user.id);
  }

  @UseGuards(AdminGuard)
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userPackagesService.findOne(id);
  }

  @UseGuards(AdminGuard)
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateUserPackageDto: UpdateUserPackageDto,
  ) {
    return this.userPackagesService.update(id, updateUserPackageDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userPackagesService.remove(id);
  }
}
