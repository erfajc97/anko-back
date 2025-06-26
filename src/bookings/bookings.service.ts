import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UserPackagesService } from '../user-packages/user-packages.service';
import { UserType } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  email: string;
  type: UserType;
}

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private userPackagesService: UserPackagesService,
  ) {}

  async create(createBookingDto: CreateBookingDto, user: AuthenticatedUser) {
    const { classScheduleId, userEmail } = createBookingDto;

    // Determinar el usuario objetivo
    let targetUserId = user.id;

    // Si es admin y se especifica un email, buscar ese usuario
    if (user.type === UserType.ADMIN && userEmail) {
      const targetUser = await this.prisma.user.findUnique({
        where: { email: userEmail },
      });
      if (!targetUser) {
        throw new NotFoundException(
          `Usuario con email "${userEmail}" no encontrado`,
        );
      }
      targetUserId = targetUser.id;
    }

    // Verificar si el horario de clase existe
    const classSchedule = await this.prisma.classSchedule.findUnique({
      where: { id: classScheduleId },
      include: {
        bookings: true,
      },
    });

    if (!classSchedule) {
      throw new NotFoundException(
        `ClassSchedule with ID "${classScheduleId}" not found`,
      );
    }

    // Verificar si el usuario ya tiene una reserva para esta clase
    const existingBooking = await this.prisma.booking.findFirst({
      where: {
        userId: targetUserId,
        classScheduleId,
      },
    });

    if (existingBooking) {
      throw new BadRequestException(
        'User already has a booking for this class',
      );
    }

    // Verificar capacidad
    const currentBookings = classSchedule.bookings.length;
    if (currentBookings >= classSchedule.maxCapacity) {
      throw new BadRequestException('Class is at full capacity');
    }

    // Consumir una clase del paquete del usuario
    await this.userPackagesService.consumeClass(targetUserId);

    return this.prisma.booking.create({
      data: {
        user: {
          connect: { id: targetUserId },
        },
        classSchedule: {
          connect: { id: classScheduleId },
        },
      },
      include: {
        user: true,
        classSchedule: {
          include: {
            teacher: true,
          },
        },
      },
    });
  }

  async findAll(page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const bookings = await this.prisma.booking.findMany({
      skip,
      take: perPage,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
        classSchedule: {
          include: {
            teacher: true,
          },
        },
      },
    });

    const total = await this.prisma.booking.count();
    const totalPages = Math.ceil(total / perPage);

    return {
      content: bookings,
      currentPage: page,
      totalPages,
      totalItems: total,
    };
  }

  async findOne(id: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        classSchedule: {
          include: {
            teacher: true,
          },
        },
      },
    });
    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }
    return booking;
  }

  async findByUser(userId: string, page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      skip,
      take: perPage,
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        classSchedule: {
          include: {
            teacher: true,
          },
        },
      },
    });

    const total = await this.prisma.booking.count({
      where: { userId },
    });
    const totalPages = Math.ceil(total / perPage);

    return {
      content: bookings,
      currentPage: page,
      totalPages,
      totalItems: total,
    };
  }

  update(id: string, updateBookingDto: UpdateBookingDto) {
    return this.prisma.booking.update({
      where: { id },
      data: updateBookingDto,
    });
  }

  async remove(id: string, user: AuthenticatedUser) {
    // Buscar la reserva
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        user: true,
        classSchedule: true,
      },
    });

    if (!booking) {
      throw new NotFoundException(`Booking with ID "${id}" not found`);
    }

    // Verificar permisos: solo el usuario propietario o un admin puede cancelar
    if (user.type !== UserType.ADMIN && booking.userId !== user.id) {
      throw new BadRequestException(
        'No tienes permisos para cancelar esta reserva',
      );
    }

    // Eliminar la reserva
    await this.prisma.booking.delete({
      where: { id },
    });

    // Devolver un crédito al usuario
    try {
      await this.userPackagesService.refundClass(booking.userId);
    } catch (error) {
      console.error('Error refunding class credit:', error);
      // No lanzamos el error para no interrumpir la cancelación
    }

    return { message: 'Reserva cancelada exitosamente' };
  }
}
