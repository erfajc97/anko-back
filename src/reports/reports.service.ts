import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getSalesReport(startDate?: Date, endDate?: Date) {
    const whereClause: any = {};

    if (startDate && endDate) {
      whereClause.purchasedAt = {
        gte: startDate,
        lte: endDate,
      };
    }

    const userPackages = await this.prisma.userPackage.findMany({
      where: whereClause,
      include: {
        classPackage: true,
        user: true,
      },
      orderBy: {
        purchasedAt: 'desc',
      },
    });

    const totalRevenue = userPackages.reduce(
      (sum, userPackage) => sum + userPackage.classPackage.price,
      0,
    );

    const totalPackagesSold = userPackages.length;

    const packagesByType = userPackages.reduce((acc, userPackage) => {
      const packageName = userPackage.classPackage.name;
      if (!acc[packageName]) {
        acc[packageName] = {
          name: packageName,
          count: 0,
          revenue: 0,
        };
      }
      acc[packageName].count++;
      acc[packageName].revenue += userPackage.classPackage.price;
      return acc;
    }, {});

    return {
      totalRevenue,
      totalPackagesSold,
      packagesByType: Object.values(packagesByType),
      sales: userPackages,
    };
  }

  async getClassUtilizationReport() {
    const classSchedules = await this.prisma.classSchedule.findMany({
      include: {
        teacher: true,
        bookings: {
          include: {
            user: true,
          },
        },
      },
    });

    const utilizationData = classSchedules.map((schedule) => ({
      id: schedule.id,
      title: schedule.title,
      teacher: `${schedule.teacher.firstName} ${schedule.teacher.lastName}`,
      startTime: schedule.startTime,
      endTime: schedule.endTime,
      maxCapacity: schedule.maxCapacity,
      currentBookings: schedule.bookings.length,
      utilizationRate: (schedule.bookings.length / schedule.maxCapacity) * 100,
      bookings: schedule.bookings,
    }));

    const averageUtilization =
      utilizationData.reduce(
        (sum, classData) => sum + classData.utilizationRate,
        0,
      ) / utilizationData.length;

    return {
      averageUtilization,
      classes: utilizationData,
    };
  }

  async getUserStatistics() {
    const totalUsers = await this.prisma.user.count();
    const verifiedUsers = await this.prisma.user.count({
      where: { isVerified: true },
    });
    const usersWithPackages = await this.prisma.user.count({
      where: {
        userPackages: {
          some: {},
        },
      },
    });
    const activeBookings = await this.prisma.booking.count({
      where: { status: 'ACTIVE' },
    });

    return {
      totalUsers,
      verifiedUsers,
      usersWithPackages,
      activeBookings,
      verificationRate: (verifiedUsers / totalUsers) * 100,
      conversionRate: (usersWithPackages / totalUsers) * 100,
    };
  }

  async getRevenueByPeriod(period: 'daily' | 'weekly' | 'monthly' = 'monthly') {
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const userPackages = await this.prisma.userPackage.findMany({
      where: {
        purchasedAt: {
          gte: startDate,
        },
      },
      include: {
        classPackage: true,
      },
    });

    const revenue = userPackages.reduce(
      (sum, userPackage) => sum + userPackage.classPackage.price,
      0,
    );

    return {
      period,
      startDate,
      endDate: now,
      revenue,
      packagesSold: userPackages.length,
    };
  }

  async getDashboardData() {
    const [salesReport, utilizationReport, userStats, monthlyRevenue] =
      await Promise.all([
        this.getSalesReport(),
        this.getClassUtilizationReport(),
        this.getUserStatistics(),
        this.getRevenueByPeriod('monthly'),
      ]);

    return {
      sales: salesReport,
      utilization: utilizationReport,
      users: userStats,
      monthlyRevenue,
    };
  }
}
