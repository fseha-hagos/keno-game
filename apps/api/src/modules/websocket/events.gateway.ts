import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { WebSocketEvents } from '@keno/shared-types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(EventsGateway.name);

  @WebSocketServer()
  server!: Server;

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    const userId = client.handshake.query?.userId || client.handshake.auth?.userId;
    if (userId && typeof userId === 'string') {
      client.join(`user_${userId}`);
      this.logger.log(`Client ${client.id} joined room user_${userId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('authenticate')
  handleAuthenticate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId?: string; token?: string },
  ) {
    if (data?.userId) {
      client.join(`user_${data.userId}`);
      this.logger.log(`Client ${client.id} authenticated and joined room user_${data.userId}`);
      return { status: 'ok', joined: `user_${data.userId}` };
    }
    return { status: 'error', message: 'No userId provided' };
  }

  broadcastRoundOpened(round: any) {
    this.server.emit(WebSocketEvents.ROUND_OPENED, round);
  }

  broadcastRoundClosed(roundId: string) {
    this.server.emit(WebSocketEvents.ROUND_CLOSED, { roundId });
  }

  broadcastDrawStarted(roundId: string) {
    this.server.emit(WebSocketEvents.DRAW_STARTED, { roundId });
  }

  broadcastNumberDrawn(
    roundId: string,
    number: number,
    drawIndex: number,
    revealedNumbers?: number[],
  ) {
    this.server.emit(WebSocketEvents.NUMBER_DRAWN, {
      roundId,
      number,
      drawIndex,
      revealedNumbers: revealedNumbers || [],
    });
  }

  broadcastRoundCompleted(round: any) {
    this.server.emit(WebSocketEvents.ROUND_COMPLETED, round);
  }

  sendBalanceUpdate(userId: string, newBalanceMinor: string) {
    const payload = {
      userId,
      balanceMinor: newBalanceMinor,
    };
    this.server.to(`user_${userId}`).emit(WebSocketEvents.WALLET_BALANCE_UPDATED, payload);
    this.server.emit(WebSocketEvents.WALLET_BALANCE_UPDATED, payload);
  }
}
