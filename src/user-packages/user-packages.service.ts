import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserPackageDto } from './dto/create-user-package.dto';
import { UpdateUserPackageDto } from './dto/update-user-package.dto';
import { UserType } from '@prisma/client';
import { EmailService } from '../email/email.service';

interface AuthenticatedUser {
  id: string;
  email: string;
  type: UserType;
}

@Injectable()
export class UserPackagesService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async create(
    authenticatedUser: AuthenticatedUser,
    createUserPackageDto: CreateUserPackageDto,
  ) {
    const { classPackageId } = createUserPackageDto;
    let targetUserId = authenticatedUser.id;

    // Si el usuario es ADMIN, puede especificar un email o un userId
    if (authenticatedUser.type === UserType.ADMIN) {
      if (createUserPackageDto.email) {
        const userByEmail = await this.prisma.user.findUnique({
          where: { email: createUserPackageDto.email },
        });
        if (!userByEmail) {
          throw new NotFoundException(
            `No se encontró un usuario con el correo ${createUserPackageDto.email}`,
          );
        }
        targetUserId = userByEmail.id;
      } else if (createUserPackageDto.userId) {
        targetUserId = createUserPackageDto.userId;
      }
    }

    // Verificar si el usuario al que se le asignará el paquete existe
    const user = await this.prisma.user.findUnique({
      where: { id: targetUserId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${targetUserId}" not found`);
    }

    // Verificar si el paquete de clase existe
    const classPackage = await this.prisma.classPackage.findUnique({
      where: { id: classPackageId },
    });
    if (!classPackage) {
      throw new NotFoundException(
        `ClassPackage with ID "${classPackageId}" not found`,
      );
    }

    // Calcular fecha de expiración y créditos restantes desde el paquete
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + classPackage.validityDays);
    const remainingCredits = classPackage.classCredits;

    const userPackage = await this.prisma.userPackage.create({
      data: {
        user: {
          connect: { id: targetUserId },
        },
        classPackage: {
          connect: { id: classPackageId },
        },
        remainingCredits,
        expiresAt,
      },
      include: {
        user: true,
        classPackage: true,
      },
    });

    // Enviar email de confirmación
    try {
      await this.emailService.sendPackagePurchaseEmail({
        userEmail: user.email,
        userName: `${user.firstName} ${user.lastName || ''}`.trim(),
        packageName: classPackage.name,
        classCredits: classPackage.classCredits,
        expiryDate: expiresAt.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        price: classPackage.price,
        transactionId: `ADMIN-${Date.now()}`, // Para asignaciones de admin
      });
    } catch (error) {
      console.error('Error sending package purchase email:', error);
      // No lanzamos el error para no interrumpir la creación del paquete
    }

    return userPackage;
  }

  async findAll(page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const userPackages = await this.prisma.userPackage.findMany({
      skip,
      take: perPage,
      orderBy: {
        purchasedAt: 'desc',
      },
      include: {
        user: true,
        classPackage: true,
      },
    });

    const total = await this.prisma.userPackage.count();
    const totalPages = Math.ceil(total / perPage);

    return {
      content: userPackages,
      currentPage: page,
      totalPages,
      totalItems: total,
    };
  }

  async findOne(id: string) {
    const userPackage = await this.prisma.userPackage.findUnique({
      where: { id },
      include: {
        user: true,
        classPackage: true,
      },
    });
    if (!userPackage) {
      throw new NotFoundException(`UserPackage with ID "${id}" not found`);
    }
    return userPackage;
  }

  async findByUser(userId: string, page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const userPackages = await this.prisma.userPackage.findMany({
      where: { userId },
      skip,
      take: perPage,
      orderBy: {
        purchasedAt: 'desc',
      },
      include: {
        classPackage: true,
      },
    });

    const total = await this.prisma.userPackage.count({
      where: { userId },
    });
    const totalPages = Math.ceil(total / perPage);

    return {
      content: userPackages,
      currentPage: page,
      totalPages,
      totalItems: total,
    };
  }

  async consumeClass(userId: string) {
    // Buscar un paquete activo del usuario con créditos disponibles y no expirado
    const userPackage = await this.prisma.userPackage.findFirst({
      where: {
        userId,
        remainingCredits: {
          gt: 0,
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        purchasedAt: 'asc', // Usar el paquete más antiguo primero
      },
    });

    if (!userPackage) {
      throw new BadRequestException('No available classes in any package');
    }

    // Consumir una clase
    return this.prisma.userPackage.update({
      where: { id: userPackage.id },
      data: {
        remainingCredits: userPackage.remainingCredits - 1,
      },
      include: {
        classPackage: true,
      },
    });
  }

  async refundClass(userId: string) {
    // Buscar un paquete activo del usuario que no esté lleno y no expirado
    const userPackage = await this.prisma.userPackage.findFirst({
      where: {
        userId,
        remainingCredits: {
          lt: 20, // Asumiendo que el máximo es 20 créditos
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: {
        purchasedAt: 'desc', // Usar el paquete más reciente primero
      },
    });

    if (!userPackage) {
      throw new BadRequestException(
        'No suitable package found to refund credit',
      );
    }

    // Devolver una clase
    return this.prisma.userPackage.update({
      where: { id: userPackage.id },
      data: {
        remainingCredits: userPackage.remainingCredits + 1,
      },
      include: {
        classPackage: true,
      },
    });
  }

  async getAvailableClasses(userId: string) {
    const userPackages = await this.prisma.userPackage.findMany({
      where: {
        userId,
        remainingCredits: {
          gt: 0,
        },
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        classPackage: true,
      },
    });

    const totalAvailable = userPackages.reduce(
      (sum, userPackage) => sum + userPackage.remainingCredits,
      0,
    );

    return {
      totalAvailable,
      packages: userPackages,
    };
  }

  update(id: string, updateUserPackageDto: UpdateUserPackageDto) {
    const { remainingCredits, expiresAt } = updateUserPackageDto;
    const data: { remainingCredits?: number; expiresAt?: Date } = {};

    if (remainingCredits !== undefined) {
      data.remainingCredits = remainingCredits;
    }

    if (expiresAt) {
      data.expiresAt = new Date(expiresAt);
    }

    return this.prisma.userPackage.update({
      where: { id },
      data,
    });
  }

  remove(id: string) {
    return this.prisma.userPackage.delete({
      where: { id },
    });
  }
}
