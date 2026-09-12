// src/modules/analytics/analytics.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from '../payments/entities/payment.entity';

@Injectable()
export class AnalyticsService {
    constructor(
        @InjectRepository(Payment)
        private paymentsRepo: Repository<Payment>,
    ) { }

    async getDashboardStats(organizationId: string, locationId?: string) {
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
            this.getStats(organizationId, today, tomorrow, locationId),
            this.getStats(organizationId, thisMonth, nextMonth, locationId),
            this.getAllTimeStats(organizationId, locationId),
            this.getRecentPayments(organizationId, 10, locationId),
            this.getCryptoBreakdown(organizationId, locationId),
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
        organizationId: string,
        from: Date,
        to: Date,
        locationId?: string,
    ) {
        const query = this.paymentsRepo
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
            .where('payment.organization_id = :organizationId', { organizationId })
            .andWhere('payment.created_at BETWEEN :from AND :to', { from, to })
            .setParameter('confirmed', PaymentStatus.CONFIRMED);

        if (locationId) {
            query.andWhere('payment.location_id = :locationId', { locationId });
        }

        const result = await query.getRawOne();

        return {
            totalTransactions: parseInt(result.totalTransactions, 10) || 0,
            confirmedTransactions: parseInt(result.confirmedTransactions, 10) || 0,
            totalAud: parseFloat(result.totalAud) || 0,
        };
    }

    private async getAllTimeStats(organizationId: string, locationId?: string) {
        const query = this.paymentsRepo
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
            .where('payment.organization_id = :organizationId', { organizationId })
            .setParameter('confirmed', PaymentStatus.CONFIRMED);

        if (locationId) {
            query.andWhere('payment.location_id = :locationId', { locationId });
        }

        const result = await query.getRawOne();

        return {
            totalTransactions: parseInt(result.totalTransactions, 10) || 0,
            confirmedTransactions: parseInt(result.confirmedTransactions, 10) || 0,
            totalAud: parseFloat(result.totalAud) || 0,
        };
    }

    private async getRecentPayments(organizationId: string, limit: number, locationId?: string) {
        const where: any = { organizationId };
        if (locationId) where.locationId = locationId;

        return this.paymentsRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
            select: [
                'id', 'audAmount', 'cryptoAmount', 'cryptoType',
                'status', 'createdAt', 'orderReference', 'locationId', 'deviceId',
            ],
        });
    }

    private async getCryptoBreakdown(organizationId: string, locationId?: string) {
        const query = this.paymentsRepo
            .createQueryBuilder('payment')
            .select('payment.crypto_type', 'cryptoType')
            .addSelect('COUNT(*)', 'count')
            .addSelect(
                'COALESCE(SUM(payment.aud_amount), 0)',
                'totalAud',
            )
            .where('payment.organization_id = :organizationId', { organizationId })
            .andWhere('payment.status = :confirmed', {
                confirmed: PaymentStatus.CONFIRMED,
            })
            .groupBy('payment.crypto_type');

        if (locationId) {
            query.andWhere('payment.location_id = :locationId', { locationId });
        }

        return query.getRawMany();
    }
}