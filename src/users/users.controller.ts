import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AdminGuard } from 'auth/guards/admin.guard';
import { JwtAuthGuard } from 'auth/guards/jwt-auth.guard';
import { CurrentUser } from 'auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
    @Query('search') search?: string,
  ) {
    return this.usersService.findAll(page, perPage, search);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getCurrentUser(@CurrentUser() user: User) {
    return this.usersService.getCurrentUser(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, updateUserDto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }

  @UseGuards(AdminGuard)
  @Get('organization/:organizationName')
  findAllByOrganization(
    @Param('organizationName') organizationName: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('perPage', new DefaultValuePipe(10), ParseIntPipe) perPage: number,
  ) {
    return this.usersService.findAllByOrganization(
      organizationName,
      page,
      perPage,
    );
  }
}
