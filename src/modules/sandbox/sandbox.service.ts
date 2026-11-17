// src/modules/sandbox/sandbox.service.ts
import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PaymentsService } from '../payments/payments.service';
import {
  PaymentStatus,
  PaymentEnvironment,
} from '../payments/entities/payment.entity';
import { SimulatePaymentTxDto } from './dto/simulate-payment.dto';
import type { AuthContext } from '../../common/interfaces/auth-context.interface';

@Injectable()
export class SandboxService {
  private readonly logger = new Logger(SandboxService.name);

  constructor(private paymentsService: PaymentsService) {}

  async simulatePaymentTx(dto: SimulatePaymentTxDto, auth: AuthContext) {
    const payment = await this.paymentsService.getPayment(dto.paymentId);

    if (
      auth.organizationId &&
      payment.organizationId !== auth.organizationId &&
      !auth.isSuperAdmin
    ) {
      throw new ForbiddenException(
        'Cannot simulate payments outside your organization',
      );
    }

    if (payment.environment !== PaymentEnvironment.TEST) {
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
