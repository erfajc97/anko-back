import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-transaction')
  async createPaymentTransaction(
    @Request() req,
    @Body()
    body: {
      packageId: string;
      clientTransactionId: string;
    },
  ) {
    return this.paymentsService.createPaymentTransaction(
      req.user.id,
      body.packageId,
      body.clientTransactionId,
    );
  }

  @Get('transaction/:clientTransactionId')
  async getPaymentTransaction(
    @Param('clientTransactionId') clientTransactionId: string,
  ) {
    return this.paymentsService.getPaymentTransaction(clientTransactionId);
  }

  @Get('my-pending-payments')
  async getMyPendingPayments(@Request() req) {
    return this.paymentsService.getUserPendingPayments(req.user.id);
  }

  @Delete('my-pending-payments/:transactionId')
  async deleteMyPendingPayment(
    @Request() req,
    @Param('transactionId') transactionId: string,
  ) {
    return this.paymentsService.deleteUserPendingPayment(
      req.user.id,
      transactionId,
    );
  }

  @Post('update-status')
  async updatePaymentStatus(
    @Body()
    body: {
      clientTransactionId: string;
      status: 'pending' | 'completed' | 'failed';
    },
  ) {
    return this.paymentsService.updatePaymentStatus(
      body.clientTransactionId,
      body.status,
    );
  }
}
