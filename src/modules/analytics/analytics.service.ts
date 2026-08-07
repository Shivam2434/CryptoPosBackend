// src/modules/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Payment)
        private paymentsRepo: Repository<Payment>,
    ) { }

    async getDashboardStats(merchantId: string) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);

        const [
            todayStats,
            monthStats,
            totalStats,
            recentPayments,
            cryptoBreakdown,
        ] = await Promise.all([
            this.getStats(merchantId, today, tomorrow),
            this.getStats(merchantId, thisMonth, nextMonth),
            this.getAllTimeStats(merchantId),
            this.getRecentPayments(merchantId, 10),
            this.getCryptoBreakdown(merchantId),
        ]);

        return {
            today: todayStats,
            thisMonth: monthStats,
            allTime: totalStats,
            recentPayments,
            cryptoBreakdown,
        };
    }

    private async getStats(
        merchantId: string,
        from: Date,
        to: Date,
    ) {
        const result = await this.paymentsRepo
            .createQueryBuilder('payment')
            .select('COUNT(*)', 'totalTransactions')
            .addSelect(
                'COUNT(CASE WHEN payment.status = :confirmed THEN 1 END)',
                'confirmedTransactions',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmed THEN payment.aud_amount ELSE 0 END), 0)',
                'totalAud',
            )
            .where('payment.merchant_id = :merchantId', { merchantId })
            .andWhere('payment.created_at BETWEEN :from AND :to', { from, to })
            .setParameter('confirmed', PaymentStatus.CONFIRMED)
            .getRawOne();

        return {
            totalTransactions: parseInt(result.totalTransactions),
            confirmedTransactions: parseInt(result.confirmedTransactions),
            totalAud: parseFloat(result.totalAud),
        };
    }

    private async getAllTimeStats(merchantId: string) {
        const result = await this.paymentsRepo
            .createQueryBuilder('payment')
            .select('COUNT(*)', 'totalTransactions')
            .addSelect(
                'COUNT(CASE WHEN payment.status = :confirmed THEN 1 END)',
                'confirmedTransactions',
            )
            .addSelect(
                'COALESCE(SUM(CASE WHEN payment.status = :confirmed THEN payment.aud_amount ELSE 0 END), 0)',
                'totalAud',
            )
            .where('payment.merchant_id = :merchantId', { merchantId })
            .setParameter('confirmed', PaymentStatus.CONFIRMED)
            .getRawOne();

        return {
            totalTransactions: parseInt(result.totalTransactions),
            confirmedTransactions: parseInt(result.confirmedTransactions),
            totalAud: parseFloat(result.totalAud),
        };
    }

    private async getRecentPayments(merchantId: string, limit: number) {
        return this.paymentsRepo.find({
            where: { merchantId },
            order: { createdAt: 'DESC' },
            take: limit,
            select: [
                'id', 'audAmount', 'cryptoAmount', 'cryptoType',
                'status', 'createdAt', 'orderReference',
            ],
        });
    }

    private async getCryptoBreakdown(merchantId: string) {
        return this.paymentsRepo
            .createQueryBuilder('payment')
            .select('payment.crypto_type', 'cryptoType')
            .addSelect('COUNT(*)', 'count')
            .addSelect(
                'COALESCE(SUM(payment.aud_amount), 0)',
                'totalAud',
            )
            .where('payment.merchant_id = :merchantId', { merchantId })
            .andWhere('payment.status = :confirmed', {
                confirmed: PaymentStatus.CONFIRMED,
            })
            .groupBy('payment.crypto_type')
            .getRawMany();
    }
}