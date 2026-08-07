// src/modules/payments/payments.controller.ts
import {
    Controller, Post, Get, Body, Param, Query, UseGuards, ParseUUIDPipe,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus } from './entities/payment.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
    constructor(private paymentsService: PaymentsService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new payment request' })
    createPayment(
        @CurrentUser('id') merchantId: string,
        @Body() dto: CreatePaymentDto,
    ) {
        return this.paymentsService.createPayment(merchantId, dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payment details (public - for customer view)' })
    getPayment(@Param('id', ParseUUIDPipe) id: string) {
        return this.paymentsService.getPayment(id);
    }

    @Get(':id/status')
    @ApiOperation({ summary: 'Get payment status (for polling)' })
    getPaymentStatus(@Param('id', ParseUUIDPipe) id: string) {
        return this.paymentsService.getPaymentStatus(id);
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get merchant payment history' })
    @ApiQuery({ name: 'page', required: false })
    @ApiQuery({ name: 'limit', required: false })
    @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
    getMerchantPayments(
        @CurrentUser('id') merchantId: string,
        @Query('page') page?: number,
        @Query('limit') limit?: number,
        @Query('status') status?: PaymentStatus,
    ) {
        return this.paymentsService.getMerchantPayments(
            merchantId,
            page || 1,
            limit || 20,
            status,
        );
    }
}