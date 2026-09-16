// src/modules/payments/payments.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Headers,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiHeader,
  ApiTags,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { CompositeAuthGuard } from '../../common/guards/composite-auth.guard';
import {
  CurrentAuth,
  CurrentOrg,
} from '../../common/decorators/current-tenant.decorator';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentStatus, PaymentEnvironment } from './entities/payment.entity';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private paymentsService: PaymentsService) {}

  @Post()
  @UseGuards(CompositeAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description: 'Secret API key (sk_live_... or sk_test_...)',
  })
  @ApiHeader({
    name: 'x-device-token',
    required: false,
    description: 'POS terminal device token',
  })
  @ApiHeader({
    name: 'idempotency-key',
    required: false,
    description: 'Unique idempotency key to prevent double charge',
  })
  @ApiOperation({ summary: 'Create a new crypto payment request (Idempotent)' })
  createPayment(
    @CurrentAuth() auth: AuthContext,
    @Body() dto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyHeader?: string,
  ) {
    if (idempotencyHeader && !dto.idempotencyKey) {
      dto.idempotencyKey = idempotencyHeader;
    }
    return this.paymentsService.createPayment(auth, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get payment details (Public - for customer checkout QR screen)',
  })
  getPayment(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPayment(id);
  }

  @Get(':id/status')
  @ApiOperation({
    summary: 'Get lightweight payment status (Public - for polling fallback)',
  })
  getPaymentStatus(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentStatus(id);
  }

  @Get()
  @UseGuards(CompositeAuthGuard)
  @ApiBearerAuth()
  @ApiHeader({ name: 'x-api-key', required: false })
  @ApiOperation({ summary: 'List tenant payments (paginated, filterable)' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', enum: PaymentStatus, required: false })
  @ApiQuery({ name: 'locationId', required: false })
  @ApiQuery({ name: 'environment', enum: PaymentEnvironment, required: false })
  getOrganizationPayments(
    @CurrentOrg() orgId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: PaymentStatus,
    @Query('locationId') locationId?: string,
    @Query('environment') environment?: PaymentEnvironment,
  ) {
    return this.paymentsService.getOrganizationPayments(
      orgId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      status,
      locationId,
      environment,
    );
  }
}
