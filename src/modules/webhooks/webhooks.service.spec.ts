// src/modules/webhooks/webhooks.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebhooksService } from './webhooks.service';
import { WebhookEndpoint, WebhookEndpointStatus } from './entities/webhook-endpoint.entity';
import { WebhookDelivery, WebhookDeliveryStatus } from './entities/webhook-delivery.entity';
import { QueueService } from '../queue/queue.service';

describe('WebhooksService', () => {
    let service: WebhooksService;
    let endpointsRepo: any;
    let deliveriesRepo: any;
    let queueService: any;

    beforeEach(async () => {
        endpointsRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'ep-uuid-1', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            find: jest.fn(),
            findOne: jest.fn(),
        };

        deliveriesRepo = {
            create: jest.fn().mockImplementation((dto) => ({ id: 'del-uuid-1', ...dto })),
            save: jest.fn().mockImplementation((entity) => Promise.resolve(entity)),
            find: jest.fn(),
            findOne: jest.fn(),
        };

        queueService = {
            publish: jest.fn().mockResolvedValue('job-uuid-1'),
            subscribe: jest.fn(),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                WebhooksService,
                { provide: getRepositoryToken(WebhookEndpoint), useValue: endpointsRepo },
                { provide: getRepositoryToken(WebhookDelivery), useValue: deliveriesRepo },
                { provide: QueueService, useValue: queueService },
            ],
        }).compile();

        service = module.get<WebhooksService>(WebhooksService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should create an endpoint with generated whsec_ secret', async () => {
        const result = await service.createEndpoint('org-uuid-1', {
            url: 'https://merchant.com/webhook',
            events: ['payment.confirmed'],
        });

        expect(result.secret).toMatch(/^whsec_[a-f0-9]{48}$/);
        expect(result.url).toBe('https://merchant.com/webhook');
        expect(result.status).toBe(WebhookEndpointStatus.ACTIVE);
    });

    it('should dispatch events to matching endpoints via queue', async () => {
        endpointsRepo.find.mockResolvedValue([
            {
                id: 'ep-1',
                organizationId: 'org-uuid-1',
                url: 'https://merchant.com/webhook',
                secret: 'whsec_test',
                events: ['*'],
                status: WebhookEndpointStatus.ACTIVE,
            },
        ]);

        await service.dispatchEvent('org-uuid-1', 'payment.confirmed', { id: 'payment-1' });

        expect(deliveriesRepo.save).toHaveBeenCalled();
        expect(queueService.publish).toHaveBeenCalledWith(
            'webhook-delivery',
            expect.objectContaining({ deliveryId: 'del-uuid-1' }),
        );
    });
});
