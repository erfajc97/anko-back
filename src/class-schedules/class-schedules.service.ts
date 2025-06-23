import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';
import { UpdateClassScheduleDto } from './dto/update-class-schedule.dto';

@Injectable()
export class ClassSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassScheduleDto: CreateClassScheduleDto) {
    const {
      teacherId,
      title,
      startDate,
      endDate,
      startHour,
      endHour,
      maxCapacity,
    } = createClassScheduleDto;

    // Verificar si el profesor existe
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${teacherId}" not found`);
    }

    // Calcular los días del rango
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const days: Date[] = [];
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // Calcular las horas de la jornada
    const [startHourNum, startMinNum] = startHour.split(':').map(Number);
    const [endHourNum, endMinNum] = endHour.split(':').map(Number);

    const createdSchedules = [];
    for (const day of days) {
      let currentHour = startHourNum;
      while (currentHour < endHourNum) {
        const slotStart = new Date(day);
        slotStart.setHours(currentHour, startMinNum, 0, 0);
        const slotEnd = new Date(day);
        slotEnd.setHours(currentHour + 1, startMinNum, 0, 0);
        if (
          slotEnd.getHours() > endHourNum ||
          (slotEnd.getHours() === endHourNum &&
            slotEnd.getMinutes() > endMinNum)
        )
          break;

        // Validar solapamiento de horarios para el mismo profesor
        const overlapping = await this.prisma.classSchedule.findFirst({
          where: {
            teacherId,
            OR: [
              {
                startTime: { lt: slotEnd },
                endTime: { gt: slotStart },
              },
            ],
          },
        });
        if (overlapping) {
          throw new Error(
            `El profesor ya tiene un horario asignado en ese rango de horas el día ${slotStart.toISOString().slice(0, 10)} de ${startHour} a ${endHour}.`,
          );
        }

        const schedule = await this.prisma.classSchedule.create({
          data: {
            teacher: { connect: { id: teacherId } },
            title,
            startTime: slotStart,
            endTime: slotEnd,
            maxCapacity,
          },
        });
        createdSchedules.push(schedule);
        currentHour++;
      }
    }
    return createdSchedules;
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

  async update(id: string, updateClassScheduleDto: UpdateClassScheduleDto) {
    const { teacherId, title, maxCapacity } = updateClassScheduleDto;
    const data: any = {};

    if (title) data.title = title;
    if (maxCapacity) data.maxCapacity = maxCapacity;
    if (teacherId) data.teacher = { connect: { id: teacherId } };

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

  async findSchedulesByDateRange(startDate?: string, endDate?: string) {
    // Calcular rango de fechas si no se proveen
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const twoWeeksLater = new Date(today);
    twoWeeksLater.setDate(today.getDate() + 14);

    const rangeStart = startDate ? new Date(startDate) : today;
    const rangeEnd = endDate ? new Date(endDate) : twoWeeksLater;

    // Traer todos los horarios en el rango, incluyendo bookings
    const classSchedules = await this.prisma.classSchedule.findMany({
      where: {
        startTime: {
          gte: rangeStart,
          lt: rangeEnd,
        },
      },
      orderBy: {
        startTime: 'asc',
      },
      include: {
        teacher: true,
        bookings: true,
      },
    });

    // Agrupar por profesor
    const teacherMap = new Map();
    for (const schedule of classSchedules) {
      const teacherId = schedule.teacher.id;
      const teacherName = `${schedule.teacher.firstName} ${schedule.teacher.lastName}`;
      if (!teacherMap.has(teacherId)) {
        teacherMap.set(teacherId, {
          teacherId,
          teacherName,
          slots: [],
        });
      }
      // Dividir el horario en bloques de 1 hora
      let slotStart = new Date(schedule.startTime);
      const slotEnd = new Date(schedule.endTime);
      while (slotStart < slotEnd) {
        const nextSlot = new Date(slotStart);
        nextSlot.setHours(nextSlot.getHours() + 1);
        if (nextSlot > slotEnd) break;
        // Calcular cuántas reservas existen para este bloque horario (todas las reservas del horario aplican a todos los bloques)
        const slotBookingsCount = schedule.bookings.length;
        const availableSpots = schedule.maxCapacity - slotBookingsCount;
        const isFull = availableSpots <= 0;
        teacherMap.get(teacherId).slots.push({
          scheduleId: schedule.id,
          date: slotStart.toISOString().slice(0, 10),
          startTime: slotStart.toISOString().slice(11, 16),
          endTime: nextSlot.toISOString().slice(11, 16),
          title: schedule.title,
          availableSpots,
          maxCapacity: schedule.maxCapacity,
          isFull,
        });
        slotStart = nextSlot;
      }
    }

    // Ordenar los slots por fecha y hora
    const result = Array.from(teacherMap.values()).map((teacher) => ({
      ...teacher,
      slots: teacher.slots.sort((a, b) => {
        if (a.date === b.date) {
          return a.startTime.localeCompare(b.startTime);
        }
        return a.date.localeCompare(b.date);
      }),
    }));

    return result;
  }

  remove(id: string) {
    return this.prisma.classSchedule.delete({
      where: { id },
    });
  }
}
