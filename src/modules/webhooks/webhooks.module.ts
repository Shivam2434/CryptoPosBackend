// src/modules/webhooks/webhooks.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WebhookEndpoint } from './entities/webhook-endpoint.entity';
import { WebhookDelivery } from './entities/webhook-delivery.entity';
import { WebhooksService } from './webhooks.service';
import { WebhooksController } from './webhooks.controller';

@Module({
    imports: [TypeOrmModule.forFeature([WebhookEndpoint, WebhookDelivery])],
    controllers: [WebhooksController],
    providers: [WebhooksService],
    exports: [WebhooksService],
})
export class WebhooksModule { }
