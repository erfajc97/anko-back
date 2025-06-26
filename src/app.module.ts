import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { OrganizationModule } from './organization/organization.module';
import { EmailModule } from './email/email.module';
import { ClassPackagesModule } from './class-packages/class-packages.module';
import { TeachersModule } from './teachers/teachers.module';
import { ClassSchedulesModule } from './class-schedules/class-schedules.module';
import { BookingsModule } from './bookings/bookings.module';
import { UserPackagesModule } from './user-packages/user-packages.module';
import { ReportsModule } from './reports/reports.module';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    OrganizationModule,
    ClassPackagesModule,
    TeachersModule,
    ClassSchedulesModule,
    BookingsModule,
    UserPackagesModule,
    ReportsModule,
    EmailModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
