import { Injectable, OnModuleInit, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ChatMessage } from '../../database/entities/chat-message.entity';
import { EventsGateway } from '../websocket/events.gateway';
import { ChatMessageDto } from '@keno/shared-types';

const INITIAL_STARTER_MESSAGES = [
  {
    username: 'j***k',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png',
    avatarColor: '#F59E0B',
    text: 'Fam',
    upvotes: 1,
  },
  {
    username: 'c***d',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png',
    avatarColor: '#b5ead7',
    text: 'Araaa minishe account layi yenabarewuni birr withdraw adaragubigni',
    upvotes: 2,
  },
  {
    username: 'c***d',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png',
    avatarColor: '#b5ead7',
    text: 'Araaa min ayinati lebinati nw koyi irasachewu withdraw adrigo miwosduti',
    upvotes: 0,
  },
  {
    username: 'i***p',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png',
    avatarColor: '#c7ceea',
    text: 'ydmrrrr',
    upvotes: 1,
  },
  {
    username: 's***r',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png',
    avatarColor: '#a2d729',
    text: 'Rain',
    upvotes: 0,
  },
  {
    username: 'z***w',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png',
    avatarColor: '#ffb7b2',
    text: '🔥',
    upvotes: 1,
  },
  {
    username: 'm***u',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png',
    avatarColor: '#b5ead7',
    text: 'Ere bamaryam',
    upvotes: 1,
  },
  {
    username: 'm***o',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png',
    avatarColor: '#ffdab9',
    text: 'Guys',
    upvotes: 0,
  },
];

@Injectable()
export class ChatService implements OnModuleInit {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatRepo: Repository<ChatMessage>,
    private readonly eventsGateway: EventsGateway,
  ) {}

  async onModuleInit() {
    try {
      const count = await this.chatRepo.count();
      if (count === 0) {
        this.logger.log('Seeding initial authentic community chat messages...');
        const baseTime = Date.now() - 1000 * 60 * 15; // 15 mins ago
        for (let i = 0; i < INITIAL_STARTER_MESSAGES.length; i++) {
          const item = INITIAL_STARTER_MESSAGES[i]!;
          const msg = this.chatRepo.create({
            ...item,
            createdAt: new Date(baseTime + i * 45000),
          });
          await this.chatRepo.save(msg);
        }
      }
    } catch (err: any) {
      this.logger.warn(`Could not seed initial chat messages: ${err.message}`);
    }
  }

  async getRecentMessages(limit = 60): Promise<ChatMessageDto[]> {
    const list = await this.chatRepo.find({
      order: { createdAt: 'DESC' },
      take: Math.min(100, Math.max(1, limit)),
    });

    // Return in ascending chronological order for chat display
    return list.reverse().map((m) => this.toDto(m));
  }

  async createMessage(payload: {
    userId?: string;
    username: string;
    avatarUrl?: string;
    avatarColor?: string;
    text: string;
  }): Promise<ChatMessageDto> {
    const text = (payload.text || '').trim();
    if (!text) {
      throw new BadRequestException('Message text cannot be empty');
    }
    if (text.length > 200) {
      throw new BadRequestException('Message exceeds maximum length of 200 characters');
    }

    const username = (payload.username || 'Player').trim().slice(0, 32);

    const message = this.chatRepo.create({
      userId: payload.userId,
      username,
      avatarUrl: payload.avatarUrl || 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png',
      avatarColor: payload.avatarColor || '#71ce96',
      text,
      upvotes: 0,
    });

    const saved = await this.chatRepo.save(message);
    const dto = this.toDto(saved);

    // Broadcast in real-time across all connected WebSocket clients
    this.eventsGateway.broadcastChatMessage(dto);

    return dto;
  }

  async likeMessage(messageId: string, action: 'like' | 'unlike' = 'like'): Promise<{ id: string; upvotes: number }> {
    const message = await this.chatRepo.findOne({ where: { id: messageId } });
    if (!message) {
      throw new BadRequestException('Message not found');
    }

    if (action === 'unlike') {
      message.upvotes = Math.max(0, (message.upvotes || 0) - 1);
    } else {
      message.upvotes = (message.upvotes || 0) + 1;
    }
    await this.chatRepo.save(message);

    // Broadcast like event to all players
    this.eventsGateway.broadcastChatLiked(message.id, message.upvotes);

    return { id: message.id, upvotes: message.upvotes };
  }

  private toDto(m: ChatMessage): ChatMessageDto {
    return {
      id: m.id,
      userId: m.userId,
      username: m.username,
      avatarUrl: m.avatarUrl,
      avatarColor: m.avatarColor,
      text: m.text,
      upvotes: m.upvotes,
      createdAt: m.createdAt ? m.createdAt.toISOString() : new Date().toISOString(),
    };
  }
}
