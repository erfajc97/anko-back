import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { AdminGuard } from '../auth/guards/admin.guard';

@UseGuards(AdminGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  getDashboardData() {
    return this.reportsService.getDashboardData();
  }

  @Get('sales')
  getSalesReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.reportsService.getSalesReport(start, end);
  }

  @Get('utilization')
  getClassUtilizationReport() {
    return this.reportsService.getClassUtilizationReport();
  }

  @Get('users')
  getUserStatistics() {
    return this.reportsService.getUserStatistics();
  }

  @Get('revenue')
  getRevenueByPeriod(
    @Query('period') period: 'daily' | 'weekly' | 'monthly' = 'monthly',
  ) {
    return this.reportsService.getRevenueByPeriod(period);
  }
}
