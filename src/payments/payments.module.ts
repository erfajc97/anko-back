import { Module } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UserPackagesModule } from '../user-packages/user-packages.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [PrismaModule, UserPackagesModule, EmailModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
