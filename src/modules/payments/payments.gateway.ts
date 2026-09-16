// src/modules/payments/payments.gateway.ts
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/payments',
})
export class PaymentsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PaymentsGateway.name);

  handleConnection(client: Socket) {
    this.logger.log(`WebSocket client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`WebSocket client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe_payment')
  handleSubscribePayment(client: Socket, paymentId: string) {
    client.join(`payment_${paymentId}`);
    this.logger.log(`Client ${client.id} subscribed to payment: ${paymentId}`);
  }

  @SubscribeMessage('unsubscribe_payment')
  handleUnsubscribePayment(client: Socket, paymentId: string) {
    client.leave(`payment_${paymentId}`);
  }

  @SubscribeMessage('subscribe_organization')
  handleSubscribeOrganization(client: Socket, organizationId: string) {
    client.join(`org_${organizationId}`);
    this.logger.log(
      `Client ${client.id} subscribed to org feed: ${organizationId}`,
    );
  }

  @SubscribeMessage('unsubscribe_organization')
  handleUnsubscribeOrganization(client: Socket, organizationId: string) {
    client.leave(`org_${organizationId}`);
  }

  // Called when payment status changes
  notifyPaymentUpdate(paymentId: string, organizationId: string, data: any) {
    const payload = {
      paymentId,
      organizationId,
      ...data,
      timestamp: new Date().toISOString(),
    };

    // Emit to payment specific room (for customer POS screen)
    this.server?.to(`payment_${paymentId}`).emit('payment_update', payload);

    // Emit to organization room (for merchant live dashboard feed)
    this.server?.to(`org_${organizationId}`).emit('payment_update', payload);

    this.logger.log(`Payment update emitted: ${paymentId} -> ${data.status}`);
  }
}
