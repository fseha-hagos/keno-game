import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';
import { WebSocketEvents } from '@keno/shared-types';
import { useGameStore } from '../store/useGameStore';
import { useAuthStore } from '../store/useAuthStore';
import { queryClient } from '../queryClient';
import { toastError } from './toast';

class SocketService {
  private socket: Socket | null = null;
  private networkListenersAttached = false;

  connect() {
    if (this.socket) return;

    const { user } = useAuthStore.getState();

    this.socket = io(API_BASE_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 3000,
      timeout: 5000,
      auth: { userId: user?.id },
      query: { userId: user?.id },
    });

    this.socket.on('connect', () => {
      console.log('[WS] Connected to Keno Gateway:', API_BASE_URL);
      useGameStore.getState().setIsOnline(true);

      const currentUser = useAuthStore.getState().user;
      if (currentUser?.id) {
        this.socket?.emit('authenticate', { userId: currentUser.id });
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected:', reason);
      useGameStore.getState().setIsOnline(false);
    });

    this.socket.on('connect_error', (err) => {
      console.warn('[WS] Connection Error:', err.message);
      useGameStore.getState().setIsOnline(false);
    });

    this.socket.io.on('reconnect_attempt', () => {
      useGameStore.getState().setIsOnline(false);
    });

    this.socket.io.on('reconnect_failed', () => {
      toastError('Connection Failed', 'Could not reach game server. Please check your network or refresh.');
    });

    // Browser network listeners (online / offline)
    if (typeof window !== 'undefined' && !this.networkListenersAttached) {
      this.networkListenersAttached = true;
      window.addEventListener('offline', () => {
        useGameStore.getState().setIsOnline(false);
      });
      window.addEventListener('online', () => {
        if (this.socket && !this.socket.connected) {
          this.socket.connect();
        }
      });
    }

    this.socket.on(WebSocketEvents.ROUND_OPENED, () => {
      useGameStore.getState().clearConfirmedTickets();
      useGameStore.getState().resetRoundDraw();
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['betHistory'] });
      queryClient.invalidateQueries({ queryKey: ['currentRound'] });
    });

    this.socket.on(WebSocketEvents.DRAW_STARTED, () => {
      useGameStore.getState().setIsDrawing(true);
      useGameStore.getState().setDrawnNumbers([]);
    });

    this.socket.on(
      WebSocketEvents.NUMBER_DRAWN,
      (data: { number: number | string; revealedNumbers?: (number | string)[] }) => {
        useGameStore.getState().setIsDrawing(true);
        if (
          data.revealedNumbers &&
          Array.isArray(data.revealedNumbers) &&
          data.revealedNumbers.length > 0
        ) {
          useGameStore.getState().setDrawnNumbers(data.revealedNumbers.map(Number));
        } else if (data.number !== undefined && data.number !== null) {
          useGameStore.getState().addDrawnNumber(Number(data.number));
        }
      }
    );

    this.socket.on(WebSocketEvents.ROUND_COMPLETED, (data) => {
      useGameStore.getState().setIsDrawing(false);
      if (data.drawResult) {
        useGameStore.getState().setDrawnNumbers(data.drawResult);
      }
      queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
      queryClient.invalidateQueries({ queryKey: ['betHistory'] });
      queryClient.invalidateQueries({ queryKey: ['recentBets'] });
      queryClient.invalidateQueries({ queryKey: ['currentRound'] });
    });

    this.socket.on(
      WebSocketEvents.WALLET_BALANCE_UPDATED,
      (data: { balanceMinor: string; userId?: string }) => {
        const currentUser = useAuthStore.getState().user;
        if (!data.userId || data.userId === currentUser?.id) {
          queryClient.invalidateQueries({ queryKey: ['walletBalance'] });
          queryClient.invalidateQueries({ queryKey: ['betHistory'] });
        }
      }
    );

    this.socket.on(WebSocketEvents.CHAT_MESSAGE_CREATED, (data) => {
      this.chatListeners.forEach((fn) => fn(data));
    });

    this.socket.on(WebSocketEvents.CHAT_MESSAGE_LIKED, (data) => {
      this.chatLikeListeners.forEach((fn) => fn(data));
    });
  }

  private chatListeners = new Set<(msg: any) => void>();
  private chatLikeListeners = new Set<(likeData: { messageId: string; upvotes: number }) => void>();

  onChatMessage(callback: (msg: any) => void) {
    this.chatListeners.add(callback);
    return () => this.chatListeners.delete(callback);
  }

  onChatLiked(callback: (data: { messageId: string; upvotes: number }) => void) {
    this.chatLikeListeners.add(callback);
    return () => this.chatLikeListeners.delete(callback);
  }

  sendChatMessage(data: any) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:send', data);
    }
  }

  likeChatMessage(messageId: string, action: 'like' | 'unlike' = 'like') {
    if (this.socket && this.socket.connected) {
      this.socket.emit('chat:like', { messageId, action });
    }
  }

  authenticateUser(userId: string) {
    if (this.socket && this.socket.connected && userId) {
      this.socket.emit('authenticate', { userId });
    }
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
