// src/modules/analytics/analytics.controller.ts
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
    constructor(private analyticsService: AnalyticsService) { }

    @Get('dashboard')
    @ApiOperation({ summary: 'Get multi-tenant dashboard analytics' })
    @ApiQuery({ name: 'locationId', required: false, description: 'Filter metrics by specific store location' })
    getDashboard(
        @CurrentOrg() orgId: string,
        @Query('locationId') locationId?: string,
    ) {
        return this.analyticsService.getDashboardStats(orgId, locationId);
    }
}