import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';
import { WebSocketEvents } from '@keno/shared-types';
import { useGameStore } from '../store/useGameStore';

class SocketService {
  private socket: Socket | null = null;

  connect() {
    if (this.socket) return;

    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to Keno Gateway');
    });

    this.socket.on(WebSocketEvents.ROUND_OPENED, (data) => {
      // Allow previous round's 20-ball draw and settlement celebration to finish
      setTimeout(() => {
        useGameStore.getState().resetRoundDraw();
      }, 3000);
    });

    this.socket.on(WebSocketEvents.DRAW_STARTED, () => {
      useGameStore.getState().setIsDrawing(true);
      useGameStore.getState().setDrawnNumbers([]);
    });

    this.socket.on(
      WebSocketEvents.NUMBER_DRAWN,
      (data: { number: number; revealedNumbers?: number[] }) => {
        useGameStore.getState().setIsDrawing(true);
        if (
          data.revealedNumbers &&
          Array.isArray(data.revealedNumbers) &&
          data.revealedNumbers.length > 0
        ) {
          useGameStore.getState().setDrawnNumbers(data.revealedNumbers);
        } else if (typeof data.number === 'number') {
          useGameStore.getState().addDrawnNumber(data.number);
        }
      },
    );

    this.socket.on(WebSocketEvents.ROUND_COMPLETED, (data) => {
      useGameStore.getState().setIsDrawing(false);
      if (data.drawResult) {
        useGameStore.getState().setDrawnNumbers(data.drawResult);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
