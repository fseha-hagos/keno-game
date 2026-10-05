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
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      timeout: 5000,
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to Keno Gateway:', API_BASE_URL);
      useGameStore.getState().setIsOnline(true);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      useGameStore.getState().setIsOnline(false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[WS] Connection Error:', err.message);
      useGameStore.getState().setIsOnline(false);
    });

    this.socket.on(WebSocketEvents.ROUND_OPENED, (data) => {
      // Clear game ticket caches and slips for the newly opened round to start over fresh
      useGameStore.getState().clearConfirmedTickets();
      useGameStore.getState().resetRoundDraw();
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

  reconnect() {
    if (this.socket) {
      this.socket.connect();
    } else {
      this.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      useGameStore.getState().setIsOnline(false);
    }
  }
}

export const socketService = new SocketService();
