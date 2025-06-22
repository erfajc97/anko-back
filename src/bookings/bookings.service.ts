import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { UserPackagesService } from '../user-packages/user-packages.service';

@Injectable()
export class BookingsService {
  constructor(
    private prisma: PrismaService,
    private userPackagesService: UserPackagesService,
  ) {}

  async create(createBookingDto: CreateBookingDto, userId: string) {
    const { classScheduleId } = createBookingDto;

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
        userId,
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
    await this.userPackagesService.consumeClass(userId);

    return this.prisma.booking.create({
      data: {
        user: {
          connect: { id: userId },
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

  remove(id: string) {
    return this.prisma.booking.delete({
      where: { id },
    });
  }
}
