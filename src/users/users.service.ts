import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<{ message: string; data: User }> {
    const newUser = await this.prisma.user.create({
      data: createUserDto,
    });
    return {
      message: 'Usuario creado exitosamente',
      data: newUser,
    };
  }

  async findAll(
    page = 1,
    perPage = 10,
  ): Promise<{
    items: User[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      perPage: number;
    };
  }> {
    const skip = (page - 1) * perPage;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: perPage,
      }),
      this.prisma.user.count(),
    ]);

    return {
      items: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / perPage),
        totalItems: total,
        perPage: perPage,
      },
    };
  }

  findOne(id: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: updateUserDto,
    });
  }

  async remove(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }
}
