// src/modules/settlements/settlements.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, IsNull } from 'typeorm';
import { Settlement, SettlementStatus } from './entities/settlement.entity';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';
import { CreateSettlementBatchDto } from './dto/create-settlement-batch.dto';
import { MerchantsService } from '../merchants/merchants.service';
import { WebhooksService } from '../webhooks/webhooks.service';
import { ManualBankPayoutProvider } from './providers/manual-bank-payout.provider';
import { MockPayoutProvider } from './providers/mock-payout.provider';

@Injectable()
export class SettlementsService {
  private readonly logger = new Logger(SettlementsService.name);

  constructor(
    @InjectRepository(Settlement)
    private settlementsRepo: Repository<Settlement>,
    @InjectRepository(Payment)
    private paymentsRepo: Repository<Payment>,
    private merchantsService: MerchantsService,
    private webhooksService: WebhooksService,
    private manualBankProvider: ManualBankPayoutProvider,
    private mockProvider: MockPayoutProvider,
  ) {}

  async createBatch(
    organizationId: string,
    dto: CreateSettlementBatchDto = {},
  ): Promise<Settlement> {
    const query: any = {
      organizationId,
      status: PaymentStatus.CONFIRMED,
      settlementId: IsNull(),
    };

    if (dto.paymentIds && dto.paymentIds.length > 0) {
      query.id = In(dto.paymentIds);
    }

    if (dto.locationId) {
      query.locationId = dto.locationId;
    }

    const payments = await this.paymentsRepo.find({ where: query });

    if (payments.length === 0) {
      throw new BadRequestException(
        'No confirmed, unsettled payments found for settlement',
      );
    }

    // Calculate totals
    const grossAud = payments.reduce((sum, p) => sum + Number(p.audAmount), 0);
    const totalCrypto = payments.reduce(
      (sum, p) => sum + Number(p.cryptoAmount),
      0,
    );
    const feePercent = 0.01; // 1% platform fee
    const feeAud = parseFloat((grossAud * feePercent).toFixed(2));
    const netAud = parseFloat((grossAud - feeAud).toFixed(2));

    // Get merchant bank details if available
    const merchants =
      await this.merchantsService.findByOrganization(organizationId);
    const primaryMerchant = merchants[0];

    const providerName = dto.payoutProvider || 'manual_bank';
    const provider =
      providerName === 'mock' ? this.mockProvider : this.manualBankProvider;

    const settlement = this.settlementsRepo.create({
      organizationId,
      merchantId: primaryMerchant?.id,
      locationId: dto.locationId,
      audAmount: grossAud,
      feeAudAmount: feeAud,
      netAudAmount: netAud,
      cryptoAmount: totalCrypto,
      cryptoType: 'AUD_CONVERTED',
      status: SettlementStatus.PROCESSING,
      paymentIds: payments.map((p) => p.id),
      payoutProvider: provider.providerName,
    });

    const saved = await this.settlementsRepo.save(settlement);

    // Link payments to settlement
    for (const p of payments) {
      p.settlementId = saved.id;
      await this.paymentsRepo.save(p);
    }

    // Trigger payout provider
    try {
      const result = await provider.executePayout({
        settlementId: saved.id,
        organizationId,
        netAudAmount: netAud,
        bankBsb: primaryMerchant?.bankBsb,
        bankAccountNumber: primaryMerchant?.bankAccountNumber,
        accountName: primaryMerchant?.businessName,
        reference: `SETTLE-${saved.id.substring(0, 8)}`,
      });

      saved.bankReference = result.providerReference;
      saved.status =
        result.status === 'completed'
          ? SettlementStatus.COMPLETED
          : SettlementStatus.PROCESSING;
      saved.metadata = result.metadata || {};
      if (result.status === 'completed') {
        saved.processedAt = new Date();
      }

      await this.settlementsRepo.save(saved);
    } catch (error) {
      this.logger.error(
        `Payout execution failed for settlement ${saved.id}: ${error.message}`,
      );
      saved.status = SettlementStatus.FAILED;
      saved.metadata = { error: error.message };
      await this.settlementsRepo.save(saved);
    }

    // Dispatch webhook event
    this.webhooksService
      .dispatchEvent(organizationId, 'settlement.created', saved)
      .catch(() => {});

    return saved;
  }

  async findAll(organizationId: string): Promise<Settlement[]> {
    return this.settlementsRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(organizationId: string, id: string): Promise<Settlement> {
    const settlement = await this.settlementsRepo.findOne({
      where: { id, organizationId },
    });
    if (!settlement) {
      throw new NotFoundException(`Settlement batch not found with ID: ${id}`);
    }
    return settlement;
  }

  async markCompleted(
    organizationId: string,
    id: string,
    bankReference?: string,
  ): Promise<Settlement> {
    const settlement = await this.findById(organizationId, id);
    settlement.status = SettlementStatus.COMPLETED;
    settlement.processedAt = new Date();
    if (bankReference) settlement.bankReference = bankReference;
    return this.settlementsRepo.save(settlement);
  }
}
