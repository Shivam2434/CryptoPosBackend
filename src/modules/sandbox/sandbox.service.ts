// src/modules/sandbox/sandbox.service.ts
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from '../payments/payments.service';
import {
  PaymentStatus,
  PaymentEnvironment,
} from '../payments/entities/payment.entity';
import { SimulatePaymentTxDto } from './dto/simulate-payment.dto';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(private paymentsService: PaymentsService) {}

  async simulatePaymentTx(dto: SimulatePaymentTxDto) {
    const payment = await this.paymentsService.getPayment(dto.paymentId);

    if (
      payment.environment !== PaymentEnvironment.TEST &&
      process.env.NODE_ENV === 'production'
    ) {
      throw new BadRequestException(
        'Sandbox simulations are only permitted for test-mode payments',
      );
    }

    const txHash =
      dto.txHash || `0xmock_${crypto.randomBytes(24).toString('hex')}`;
    const confirmations =
      dto.confirmations ??
      (dto.status === PaymentStatus.CONFIRMED
        ? payment.requiredConfirmations
        : 1);

    const updated = await this.paymentsService.updatePaymentStatus(
      dto.paymentId,
      dto.status,
      {
        txHash,
        confirmations,
        receivedAmount: payment.cryptoAmount,
      },
    );

    this.logger.log(
      `[SANDBOX SIMULATION] Payment ${payment.id} transitioned to ${dto.status} (Confirmations: ${confirmations})`,
    );

    return {
      success: true,
      message: `Payment simulated as ${dto.status}`,
      payment: updated,
    };
  }
}
