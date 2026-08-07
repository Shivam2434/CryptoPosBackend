// src/modules/payments/payments.gateway.ts
import {
    WebSocketGateway, WebSocketServer, SubscribeMessage,
    OnGatewayConnection, OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
    cors: { origin: '*' },
    namespace: '/payments',
})
export class PaymentsGateway
    implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(PaymentsGateway.name);

    handleConnection(client: Socket) {
        this.logger.log(`Client connected: ${client.id}`);
    }

    handleDisconnect(client: Socket) {
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    @SubscribeMessage('subscribe_payment')
    handleSubscribePayment(client: Socket, paymentId: string) {
        client.join(`payment_${paymentId}`);
        this.logger.log(`Client ${client.id} subscribed to payment ${paymentId}`);
    }

    @SubscribeMessage('unsubscribe_payment')
    handleUnsubscribePayment(client: Socket, paymentId: string) {
        client.leave(`payment_${paymentId}`);
    }

    // Called by blockchain monitor when payment status changes
    notifyPaymentUpdate(paymentId: string, data: any) {
        this.server.to(`payment_${paymentId}`).emit('payment_update', {
            paymentId,
            ...data,
        });
        this.logger.log(
            `Payment update emitted: ${paymentId} -> ${data.status}`,
        );
    }
}