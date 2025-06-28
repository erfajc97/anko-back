import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { PrismaService } from '../prisma/prisma.service';
import { User } from './entities/user.entity';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {}

  async create(
    createUserDto: CreateUserDto,
  ): Promise<{ message: string; data: User }> {
    // Verificar si el email ya existe
    const existingUserByEmail = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUserByEmail) {
      throw new ConflictException('El email ya está registrado');
    }

    // Verificar si la cédula ya existe
    const existingUserByCedula = await this.prisma.user.findUnique({
      where: { cedula: createUserDto.cedula },
    });

    if (existingUserByCedula) {
      throw new ConflictException('La cédula ya está registrada');
    }

    // Verificar si el teléfono ya existe
    const existingUserByTelephone = await this.prisma.user.findFirst({
      where: { telephone: createUserDto.telephone },
    });

    if (existingUserByTelephone) {
      throw new ConflictException('El teléfono ya está registrado');
    }

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    // Generar token de verificación
    const verificationToken = uuidv4();
    const verificationTokenExpiresAt = new Date(
      Date.now() + 24 * 60 * 60 * 1000, // 24 horas
    );

    const newUser = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
        verificationToken,
        verificationTokenExpiresAt,
      },
    });

    // Enviar email de verificación
    const verificationLink = `${this.configService.get<string>(
      'FRONTEND_URL',
    )}/verify-email/${verificationToken}`;

    try {
      await this.emailService.sendEmail({
        to: newUser.email,
        subject: `¡Bienvenido a Anko, ${newUser.firstName}!`,
        templateName: 'user-verification',
        replacements: {
          name: newUser.firstName,
          verificationLink,
        },
      });
    } catch (emailError) {
      console.error(
        `[Creación de usuario] No se pudo enviar el correo a ${newUser.email}:`,
        emailError,
      );
    }

    return {
      message:
        'Usuario creado exitosamente. Se ha enviado un correo de verificación.',
      data: newUser,
    };
  }

  async findAll(
    page = 1,
    perPage = 10,
    search?: string,
  ): Promise<{
    items: User[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      perPage: number;
    };
  }> {
    const skip = (page - 1) * perPage;

    const whereClause = search ? { email: { contains: search } } : undefined;

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: perPage,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      items: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / perPage),
        totalItems: total,
        perPage: perPage,
      },
    };
  }

  findOne(id: string): Promise<User> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    const data = { ...updateUserDto };

    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async remove(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${id} no encontrado`);
    }

    return this.prisma.user.delete({
      where: { id },
    });
  }

  async findAllByOrganization(
    organizationName: string,
    page = 1,
    perPage = 10,
  ) {
    const skip = (page - 1) * perPage;
    const whereClause = {
      memberships: {
        some: {
          organization: {
            name: organizationName,
          },
        },
      },
    };

    const [users, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where: whereClause,
        skip,
        take: perPage,
      }),
      this.prisma.user.count({ where: whereClause }),
    ]);

    return {
      items: users,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / perPage),
        totalItems: total,
        perPage: perPage,
      },
    };
  }

  async getCurrentUser(
    userId: string,
  ): Promise<{ message: string; data: UserResponseDto }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        cedula: true,
        telephone: true,
        firstName: true,
        lastName: true,
        isVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`Usuario con id ${userId} no encontrado`);
    }

    return {
      message: 'Información del usuario obtenida exitosamente',
      data: user,
    };
  }
}
