import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserPackagesService } from '../user-packages/user-packages.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private userPackagesService: UserPackagesService,
    private emailService: EmailService,
  ) {}

  async createPaymentTransaction(
    userId: string,
    packageId: string,
    clientTransactionId: string,
  ) {
    // Verificar que el usuario existe
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    // Verificar que el paquete existe y obtener su precio
    const package_ = await this.prisma.classPackage.findUnique({
      where: { id: packageId },
    });
    if (!package_) {
      throw new NotFoundException(`Package with ID "${packageId}" not found`);
    }

    // Crear la transacción pendiente usando el precio del paquete
    const transaction = await this.prisma.paymentTransaction.create({
      data: {
        userId,
        packageId,
        clientTransactionId,
        amount: package_.price,
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
      // Obtener la información del usuario para crear el AuthenticatedUser
      const user = await this.prisma.user.findUnique({
        where: { id: transaction.userId },
      });

      if (user) {
        await this.userPackagesService.create(
          {
            id: user.id,
            email: user.email,
            type: user.type,
          },
          {
            classPackageId: transaction.packageId,
          },
        );

        // Enviar email de confirmación de compra
        try {
          const expiresAt = new Date();
          expiresAt.setDate(
            expiresAt.getDate() + transaction.package.validityDays,
          );

          await this.emailService.sendPackagePurchaseEmail({
            userEmail: user.email,
            userName: `${user.firstName} ${user.lastName || ''}`.trim(),
            packageName: transaction.package.name,
            classCredits: transaction.package.classCredits,
            expiryDate: expiresAt.toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }),
            price: transaction.amount.toNumber(),
            transactionId: clientTransactionId,
          });
        } catch (error) {
          console.error('Error sending package purchase email:', error);
          // No lanzamos el error para no interrumpir el proceso
        }
      }
    }

    return updatedTransaction;
  }
}
