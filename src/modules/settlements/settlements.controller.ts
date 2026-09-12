// src/modules/settlements/settlements.controller.ts
import {
    Controller, Get, Post, Body, Param, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentOrg } from '../../common/decorators/current-tenant.decorator';
import { SettlementsService } from './settlements.service';
import { CreateSettlementBatchDto } from './dto/create-settlement-batch.dto';

@ApiTags('Settlements')
@Controller('settlements')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class SettlementsController {
    constructor(private settlementsService: SettlementsService) { }

    @Post('batch')
    @ApiOperation({ summary: 'Create an AUD settlement payout batch for confirmed payments' })
    createBatch(@CurrentOrg() orgId: string, @Body() dto: CreateSettlementBatchDto) {
        return this.settlementsService.createBatch(orgId, dto);
    }

    @Get()
    @ApiOperation({ summary: 'List all settlement payout batches for the organization' })
    findAll(@CurrentOrg() orgId: string) {
        return this.settlementsService.findAll(orgId);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get settlement batch details by ID' })
    findById(@CurrentOrg() orgId: string, @Param('id', ParseUUIDPipe) id: string) {
        return this.settlementsService.findById(orgId, id);
    }
}
