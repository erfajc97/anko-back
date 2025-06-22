import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassPackageDto } from './dto/create-class-package.dto';
import { UpdateClassPackageDto } from './dto/update-class-package.dto';

@Injectable()
export class ClassPackagesService {
  constructor(private prisma: PrismaService) {}

  create(createClassPackageDto: CreateClassPackageDto) {
    return this.prisma.classPackage.create({
      data: createClassPackageDto,
    });
  }

  findAll() {
    return this.prisma.classPackage.findMany();
  }

  async findOne(id: string) {
    const classPackage = await this.prisma.classPackage.findUnique({
      where: { id },
    });
    if (!classPackage) {
      throw new NotFoundException(`Package with ID "${id}" not found`);
    }
    return classPackage;
  }

  update(id: string, updateClassPackageDto: UpdateClassPackageDto) {
    return this.prisma.classPackage.update({
      where: { id },
      data: updateClassPackageDto,
    });
  }

  remove(id: string) {
    return this.prisma.classPackage.delete({
      where: { id },
    });
  }
}
