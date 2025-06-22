import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';
import { UpdateClassScheduleDto } from './dto/update-class-schedule.dto';

@Injectable()
export class ClassSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassScheduleDto: CreateClassScheduleDto) {
    const { teacherId, ...rest } = createClassScheduleDto;

    // Verificar si el profesor existe
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${teacherId}" not found`);
    }

    return this.prisma.classSchedule.create({
      data: {
        ...rest,
        teacher: {
          connect: { id: teacherId },
        },
      },
    });
  }

  async findAll(page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const classSchedules = await this.prisma.classSchedule.findMany({
      skip,
      take: perPage,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        teacher: true,
      },
    });

    const total = await this.prisma.classSchedule.count();
    const totalPages = Math.ceil(total / perPage);

    return {
      content: classSchedules,
      currentPage: page,
      totalPages,
      totalItems: total,
    };
  }

  async findOne(id: string) {
    const classSchedule = await this.prisma.classSchedule.findUnique({
      where: { id },
      include: { teacher: true },
    });
    if (!classSchedule) {
      throw new NotFoundException(`ClassSchedule with ID "${id}" not found`);
    }
    return classSchedule;
  }

  update(id: string, updateClassScheduleDto: UpdateClassScheduleDto) {
    const { teacherId, ...rest } = updateClassScheduleDto;
    const data = { ...rest };

    if (teacherId) {
      data['teacher'] = { connect: { id: teacherId } };
    }

    return this.prisma.classSchedule.update({
      where: { id },
      data,
    });
  }

  async findAvailableSchedules(page: number, perPage: number) {
    const skip = (page - 1) * perPage;
    const classSchedules = await this.prisma.classSchedule.findMany({
      skip,
      take: perPage,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        teacher: true,
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Enriquecer con información de disponibilidad
    const schedulesWithAvailability = classSchedules.map((schedule) => {
      const currentBookings = schedule.bookings.length;
      const availableSpots = schedule.maxCapacity - currentBookings;
      const isFull = availableSpots <= 0;
      const utilizationRate = (currentBookings / schedule.maxCapacity) * 100;

      return {
        id: schedule.id,
        title: schedule.title,
        teacher: {
          id: schedule.teacher.id,
          name: `${schedule.teacher.firstName} ${schedule.teacher.lastName}`,
        },
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        maxCapacity: schedule.maxCapacity,
        currentBookings,
        availableSpots,
        isFull,
        utilizationRate,
        duration: Math.round(
          (new Date(schedule.endTime).getTime() -
            new Date(schedule.startTime).getTime()) /
            (1000 * 60),
        ), // duración en minutos
        bookings: schedule.bookings,
      };
    });

    const total = await this.prisma.classSchedule.count();
    const totalPages = Math.ceil(total / perPage);

    return {
      content: schedulesWithAvailability,
      currentPage: page,
      totalPages,
      totalItems: total,
    };
  }

  async findSchedulesByDateRange(
    startDate: string,
    endDate: string,
    page: number,
    perPage: number,
  ) {
    const skip = (page - 1) * perPage;
    const classSchedules = await this.prisma.classSchedule.findMany({
      where: {
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      skip,
      take: perPage,
      orderBy: {
        startTime: 'asc',
      },
      include: {
        teacher: true,
        bookings: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    // Enriquecer con información de disponibilidad
    const schedulesWithAvailability = classSchedules.map((schedule) => {
      const currentBookings = schedule.bookings.length;
      const availableSpots = schedule.maxCapacity - currentBookings;
      const isFull = availableSpots <= 0;
      const utilizationRate = (currentBookings / schedule.maxCapacity) * 100;

      return {
        id: schedule.id,
        title: schedule.title,
        teacher: {
          id: schedule.teacher.id,
          name: `${schedule.teacher.firstName} ${schedule.teacher.lastName}`,
        },
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        maxCapacity: schedule.maxCapacity,
        currentBookings,
        availableSpots,
        isFull,
        utilizationRate,
        duration: Math.round(
          (new Date(schedule.endTime).getTime() -
            new Date(schedule.startTime).getTime()) /
            (1000 * 60),
        ),
        bookings: schedule.bookings,
      };
    });

    const total = await this.prisma.classSchedule.count({
      where: {
        startTime: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });
    const totalPages = Math.ceil(total / perPage);

    return {
      content: schedulesWithAvailability,
      currentPage: page,
      totalPages,
      totalItems: total,
      dateRange: {
        startDate,
        endDate,
      },
    };
  }

  remove(id: string) {
    return this.prisma.classSchedule.delete({
      where: { id },
    });
  }
}
