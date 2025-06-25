import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateClassScheduleDto } from './dto/create-class-schedule.dto';
import { UpdateClassScheduleDto } from './dto/update-class-schedule.dto';

@Injectable()
export class ClassSchedulesService {
  constructor(private prisma: PrismaService) {}

  async create(createClassScheduleDto: CreateClassScheduleDto) {
    const { teacherId, title, startTime, endTime, maxCapacity } =
      createClassScheduleDto;

    // Verificar si el profesor existe
    const teacher = await this.prisma.teacher.findUnique({
      where: { id: teacherId },
    });
    if (!teacher) {
      throw new NotFoundException(`Teacher with ID "${teacherId}" not found`);
    }

    // Convertir a Date
    const start = new Date(startTime);
    const end = new Date(endTime);

    // Validar que end > start
    if (end <= start) {
      throw new Error('La fecha y hora de fin debe ser mayor a la de inicio');
    }

    // Calcular los días del rango
    const days: Date[] = [];
    const d = new Date(start);
    d.setHours(0, 0, 0, 0);
    const endDay = new Date(end);
    endDay.setHours(0, 0, 0, 0);
    while (d <= endDay) {
      days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }

    // Calcular las horas de la jornada para cada día
    const createdSchedules = [];
    const failedBlocks = [];
    for (const day of days) {
      // Definir el rango de horas para este día
      const dayStart = new Date(day);
      const dayEnd = new Date(day);
      if (day.getTime() === days[0].getTime()) {
        // Primer día: usar la hora de start
        dayStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
      } else {
        dayStart.setHours(0, 0, 0, 0);
      }
      if (day.getTime() === days[days.length - 1].getTime()) {
        // Último día: usar la hora de end
        dayEnd.setHours(end.getHours(), end.getMinutes(), 0, 0);
      } else {
        dayEnd.setHours(23, 59, 59, 999);
      }
      // Crear bloques de 1 hora
      let current = new Date(dayStart);
      while (current < dayEnd) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current);
        slotEnd.setHours(slotEnd.getHours() + 1);
        if (slotEnd > dayEnd) break;
        // Validar solapamiento
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
          failedBlocks.push({
            date: slotStart.toISOString().slice(0, 10),
            startTime: slotStart.toISOString().slice(11, 16),
            endTime: slotEnd.toISOString().slice(11, 16),
            message: `El profesor ya tiene un horario asignado en este bloque: ${slotStart.toISOString().slice(0, 10)} de ${slotStart.toISOString().slice(11, 16)} a ${slotEnd.toISOString().slice(11, 16)}.`,
          });
        } else {
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
        }
        current = slotEnd;
      }
    }
    return {
      created: createdSchedules,
      failed: failedBlocks,
    };
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
    const daysArr = [];
    const weekDays = [
      'domingo',
      'lunes',
      'martes',
      'miércoles',
      'jueves',
      'viernes',
      'sábado',
    ];
    // Definir rango de horas fijo
    const hourStart = 6;
    const hourEnd = 22;
    const hoursArr = [];
    for (let h = hourStart; h < hourEnd; h++) {
      const start = h.toString().padStart(2, '0') + ':00';
      const end = (h + 1).toString().padStart(2, '0') + ':00';
      hoursArr.push({ start, end });
    }
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      daysArr.push({
        iso: d.toISOString().slice(0, 10),
        weekday: weekDays[d.getDay()],
        day: d.getDate(),
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        blocks: [],
      });
    }

    const rangeStart = startDate ? new Date(startDate) : today;
    const rangeEnd = endDate
      ? new Date(endDate)
      : new Date(today.getTime() + 13 * 24 * 60 * 60 * 1000);
    rangeEnd.setHours(23, 59, 59, 999);

    // Traer todos los horarios en el rango, incluyendo bookings
    const classSchedules = await this.prisma.classSchedule.findMany({
      where: {
        startTime: {
          gte: rangeStart,
          lte: rangeEnd,
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

    // Indexar bloques por día y hora
    const blocksMap = {};
    for (const schedule of classSchedules) {
      let slotStart = new Date(schedule.startTime);
      const slotEnd = new Date(schedule.endTime);
      while (slotStart < slotEnd) {
        const nextSlot = new Date(slotStart);
        nextSlot.setHours(nextSlot.getHours() + 1);
        if (nextSlot > slotEnd) break;
        const slotDateIso = slotStart.toISOString().slice(0, 10);
        const slotStartHour = slotStart.toISOString().slice(11, 16);
        if (!blocksMap[slotDateIso]) blocksMap[slotDateIso] = {};
        blocksMap[slotDateIso][slotStartHour] = {
          scheduleId: schedule.id,
          teacherId: schedule.teacher.id,
          teacherName: `${schedule.teacher.firstName} ${schedule.teacher.lastName}`,
          title: schedule.title,
          startTime: slotStartHour,
          endTime: nextSlot.toISOString().slice(11, 16),
          availableSpots: schedule.maxCapacity - schedule.bookings.length,
          maxCapacity: schedule.maxCapacity,
          isFull: schedule.maxCapacity - schedule.bookings.length <= 0,
          libre: false,
        };
        slotStart = nextSlot;
      }
    }

    // Llenar los bloques de cada día con el rango fijo de horas
    for (const day of daysArr) {
      for (const hour of hoursArr) {
        const block = blocksMap[day.iso]?.[hour.start];
        if (block) {
          day.blocks.push(block);
        } else {
          day.blocks.push({
            startTime: hour.start,
            endTime: hour.end,
            libre: true,
          });
        }
      }
    }

    return { days: daysArr, hours: hoursArr.map((h) => h.start) };
  }

  remove(id: string) {
    return this.prisma.classSchedule.delete({
      where: { id },
    });
  }
}
