import { Module } from '@nestjs/common';
import { UserPackagesService } from './user-packages.service';
import { UserPackagesController } from './user-packages.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [PrismaModule, UsersModule],
  controllers: [UserPackagesController],
  providers: [UserPackagesService],
  exports: [UserPackagesService],
})
export class UserPackagesModule {}
