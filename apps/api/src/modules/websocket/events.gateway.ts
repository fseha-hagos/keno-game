import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
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
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
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

  broadcastNumberDrawn(roundId: string, number: number, drawIndex: number) {
    this.server.emit(WebSocketEvents.NUMBER_DRAWN, {
      roundId,
      number,
      drawIndex,
    });
  }

  broadcastRoundCompleted(round: any) {
    this.server.emit(WebSocketEvents.ROUND_COMPLETED, round);
  }

  sendBalanceUpdate(userId: string, newBalanceMinor: string) {
    this.server.to(`user_${userId}`).emit(WebSocketEvents.WALLET_BALANCE_UPDATED, {
      balanceMinor: newBalanceMinor,
    });
  }
}
