// src/modules/webhooks/webhooks.service.ts
import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import axios from 'axios';
import * as crypto from 'crypto';
import { WebhookEndpoint, WebhookEndpointStatus } from './entities/webhook-endpoint.entity';
import { WebhookDelivery, WebhookDeliveryStatus } from './entities/webhook-delivery.entity';
import { CreateWebhookEndpointDto } from './dto/create-webhook-endpoint.dto';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class WebhooksService implements OnModuleInit {
    private readonly logger = new Logger(WebhooksService.name);

    constructor(
        @InjectRepository(WebhookEndpoint)
        private endpointsRepo: Repository<WebhookEndpoint>,
        @InjectRepository(WebhookDelivery)
        private deliveriesRepo: Repository<WebhookDelivery>,
        private queueService: QueueService,
    ) { }

    onModuleInit() {
        this.queueService.subscribe('webhook-delivery', async (payload: { deliveryId: string }) => {
            await this.executeDelivery(payload.deliveryId);
        });
    }

    async createEndpoint(organizationId: string, dto: CreateWebhookEndpointDto): Promise<WebhookEndpoint> {
        const secret = `whsec_${crypto.randomBytes(24).toString('hex')}`;
        const endpoint = this.endpointsRepo.create({
            ...dto,
            organizationId,
            secret,
            events: dto.events || ['*'],
            status: WebhookEndpointStatus.ACTIVE,
        });

        return this.endpointsRepo.save(endpoint);
    }

    async findAllEndpoints(organizationId: string): Promise<WebhookEndpoint[]> {
        return this.endpointsRepo.find({
            where: { organizationId },
            order: { createdAt: 'DESC' },
        });
    }

    async findEndpointById(organizationId: string, id: string): Promise<WebhookEndpoint> {
        const endpoint = await this.endpointsRepo.findOne({
            where: { id, organizationId },
        });
        if (!endpoint) throw new NotFoundException(`Webhook endpoint not found with ID: ${id}`);
        return endpoint;
    }

    async deleteEndpoint(organizationId: string, id: string): Promise<{ success: boolean }> {
        const endpoint = await this.findEndpointById(organizationId, id);
        endpoint.status = WebhookEndpointStatus.DISABLED;
        await this.endpointsRepo.save(endpoint);
        return { success: true };
    }

    async dispatchEvent(organizationId: string, eventType: string, data: any): Promise<void> {
        const endpoints = await this.endpointsRepo.find({
            where: { organizationId, status: WebhookEndpointStatus.ACTIVE },
        });

        const matching = endpoints.filter(
            (ep) => ep.events.includes('*') || ep.events.includes(eventType),
        );

        if (matching.length === 0) return;

        const payload = {
            id: `evt_${crypto.randomBytes(12).toString('hex')}`,
            event: eventType,
            data,
            timestamp: new Date().toISOString(),
        };

        for (const ep of matching) {
            const delivery = this.deliveriesRepo.create({
                organizationId,
                endpointId: ep.id,
                eventType,
                payload,
                status: WebhookDeliveryStatus.PENDING,
                attempts: 0,
                maxAttempts: 5,
            });

            const saved = await this.deliveriesRepo.save(delivery);
            await this.queueService.publish('webhook-delivery', { deliveryId: saved.id });
        }
    }

    async executeDelivery(deliveryId: string): Promise<void> {
        const delivery = await this.deliveriesRepo.findOne({ where: { id: deliveryId } });
        if (!delivery) return;

        const endpoint = await this.endpointsRepo.findOne({ where: { id: delivery.endpointId } });
        if (!endpoint || endpoint.status !== WebhookEndpointStatus.ACTIVE) {
            delivery.status = WebhookDeliveryStatus.FAILED;
            delivery.error = 'Webhook endpoint inactive or deleted';
            await this.deliveriesRepo.save(delivery);
            return;
        }

        const timestamp = Math.floor(Date.now() / 1000);
        const payloadJson = JSON.stringify(delivery.payload);
        const signature = this.generateSignature(payloadJson, endpoint.secret, timestamp);

        delivery.signature = signature;
        delivery.attempts += 1;

        try {
            const response = await axios.post(endpoint.url, delivery.payload, {
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'CryptoPOS-Webhook-Dispatcher/1.0',
                    'X-CryptoPOS-Signature': `t=${timestamp},v1=${signature}`,
                },
                timeout: 10000,
            });

            delivery.status = WebhookDeliveryStatus.SUCCESS;
            delivery.httpStatusCode = response.status;
            delivery.responseBody = typeof response.data === 'string' ? response.data.substring(0, 1000) : JSON.stringify(response.data).substring(0, 1000);
            delivery.deliveredAt = new Date();
            delivery.error = undefined;

            await this.deliveriesRepo.save(delivery);
            this.logger.log(`Webhook delivery ${delivery.id} (${delivery.eventType}) to ${endpoint.url} succeeded [${response.status}]`);
        } catch (error) {
            delivery.httpStatusCode = error.response?.status;
            delivery.responseBody = error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : undefined;
            delivery.error = error.message;

            if (delivery.attempts >= delivery.maxAttempts) {
                delivery.status = WebhookDeliveryStatus.FAILED;
                this.logger.warn(`Webhook delivery ${delivery.id} permanently failed after ${delivery.attempts} attempts`);
            } else {
                const backoffSeconds = Math.min(60 * Math.pow(2, delivery.attempts - 1), 7200); // 1m, 2m, 4m, 8m... max 2h
                delivery.nextRetryAt = new Date(Date.now() + backoffSeconds * 1000);
                await this.queueService.publish(
                    'webhook-delivery',
                    { deliveryId: delivery.id },
                    { delayMs: backoffSeconds * 1000 },
                );
                this.logger.warn(`Webhook delivery ${delivery.id} failed attempt ${delivery.attempts}. Retrying in ${backoffSeconds}s`);
            }

            await this.deliveriesRepo.save(delivery);
        }
    }

    async getDeliveries(organizationId: string, endpointId?: string, limit = 50): Promise<WebhookDelivery[]> {
        const where: any = { organizationId };
        if (endpointId) where.endpointId = endpointId;

        return this.deliveriesRepo.find({
            where,
            order: { createdAt: 'DESC' },
            take: limit,
        });
    }

    private generateSignature(payload: string, secret: string, timestamp: number): string {
        const payloadToSign = `${timestamp}.${payload}`;
        return crypto.createHmac('sha256', secret).update(payloadToSign).digest('hex');
    }
}
