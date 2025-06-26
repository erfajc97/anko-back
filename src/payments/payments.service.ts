import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPackagesService } from '../user-packages/user-packages.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private userPackagesService: UserPackagesService,
  ) {}

  async createPaymentTransaction(
    userId: string,
    packageId: string,
    clientTransactionId: string,
    amount: number,
  ) {
    // Verificar que el usuario y el paquete existen
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const package_ = await this.prisma.classPackage.findUnique({
      where: { id: packageId },
    });
    if (!package_) {
      throw new NotFoundException(`Package with ID "${packageId}" not found`);
    }

    // Crear la transacción pendiente
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        packageId,
        clientTransactionId,
        amount,
        status: 'pending',
      },
      include: {
        user: true,
        package: true,
      },
    });

    return transaction;
  }

  async getPaymentTransaction(clientTransactionId: string) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { clientTransactionId },
      include: {
        user: true,
        package: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction with clientTransactionId "${clientTransactionId}" not found`,
      );
    }

    return transaction;
  }

  async getUserPendingPayments(userId: string) {
    return this.prisma.paymentTransaction.findMany({
      where: {
        userId,
        status: 'pending',
      },
      include: {
        package: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async updatePaymentStatus(
    clientTransactionId: string,
    status: 'pending' | 'completed' | 'failed',
  ) {
    const transaction = await this.prisma.paymentTransaction.findUnique({
      where: { clientTransactionId },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction with clientTransactionId "${clientTransactionId}" not found`,
      );
    }

    // Si el status ya está actualizado, no hacer nada
    if (transaction.status === status) {
      return transaction;
    }

    // Actualizar el status
    const updatedTransaction = await this.prisma.paymentTransaction.update({
      where: { clientTransactionId },
      data: { status },
      include: {
        user: true,
        package: true,
      },
    });

    // Si el pago se completó, asignar el paquete al usuario
    if (status === 'completed') {
      await this.userPackagesService.create(
        {
          userId: transaction.userId,
          packageId: transaction.packageId,
        },
        transaction.userId,
      );
    }

    return updatedTransaction;
  }
}
