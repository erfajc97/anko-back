import { Module } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { UserPackagesModule } from '../user-packages/user-packages.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, UsersModule, UserPackagesModule, EmailModule],
  controllers: [BookingsController],
  providers: [BookingsService],
})
export class BookingsModule {}
