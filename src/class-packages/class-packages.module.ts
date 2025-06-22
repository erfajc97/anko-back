import { Module } from '@nestjs/common';
import { ClassPackagesService } from './class-packages.service';
import { ClassPackagesController } from './class-packages.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [ClassPackagesController],
  providers: [ClassPackagesService],
})
export class ClassPackagesModule {}
