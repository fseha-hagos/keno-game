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
    upvotes: 2,
  },
  {
    username: 'c***d',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png',
    avatarColor: '#b5ead7',
    text: 'Araaa minishe account layi yenabarewuni birr withdraw adaragubigni',
    upvotes: 3,
  },
  {
    username: 'c***d',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png',
    avatarColor: '#b5ead7',
    text: 'Araaa min ayinati lebinati nw koyi irasachewu withdraw adrigo miwosduti',
    upvotes: 1,
  },
  {
    username: 'i***p',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png',
    avatarColor: '#c7ceea',
    text: 'ydmrrrr',
    upvotes: 4,
  },
  {
    username: 's***r',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png',
    avatarColor: '#a2d729',
    text: 'Rain',
    upvotes: 2,
  },
  {
    username: 'z***w',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png',
    avatarColor: '#ffb7b2',
    text: '🔥',
    upvotes: 5,
  },
  {
    username: 'm***u',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png',
    avatarColor: '#b5ead7',
    text: 'Ere bamaryam',
    upvotes: 2,
  },
  {
    username: 'm***o',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png',
    avatarColor: '#ffdab9',
    text: 'Guys',
    upvotes: 1,
  },
  {
    username: 'b***k',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-5.png',
    avatarColor: '#38bdf8',
    text: '70 and 77 please 🙏',
    upvotes: 3,
  },
  {
    username: '09***44',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-9.png',
    avatarColor: '#f59e0b',
    text: '3 hit out of 4, need one more!',
    upvotes: 2,
  },
  {
    username: 'k***m',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-2.png',
    avatarColor: '#71ce96',
    text: 'Big win on 5 picks! 🔥',
    upvotes: 6,
  },
  {
    username: 'd***a',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-10.png',
    avatarColor: '#c7ceea',
    text: 'Good luck everyone 🍀',
    upvotes: 4,
  },
  {
    username: 't***e',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-6.png',
    avatarColor: '#a2d729',
    text: '10 birr and a dream 🚀',
    upvotes: 5,
  },
  {
    username: '09***82',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-11.png',
    avatarColor: '#ffb7b2',
    text: 'Rain pls admin 🌧️',
    upvotes: 3,
  },
  {
    username: 'h***s',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-13.png',
    avatarColor: '#ffdab9',
    text: 'Let’s hit that 80!',
    upvotes: 2,
  },
  {
    username: 'y***n',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-15.png',
    avatarColor: '#38bdf8',
    text: '💥💥💥 wow',
    upvotes: 1,
  },
  {
    username: 'a***b',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-8.png',
    avatarColor: '#b5ead7',
    text: 'ayzoh fam bet small first',
    upvotes: 4,
  },
  {
    username: '07***19',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-16.png',
    avatarColor: '#F59E0B',
    text: 'አረ በስማም ዛሬ ተመችቶኛል',
    upvotes: 3,
  },
  {
    username: 'f***e',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-1.png',
    avatarColor: '#71ce96',
    text: '500 birr profit today let\'s go',
    upvotes: 5,
  },
  {
    username: 'n***a',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-3.png',
    avatarColor: '#c7ceea',
    text: '14 28 42 numbers incoming',
    upvotes: 2,
  },
  {
    username: '09***91',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-5.png',
    avatarColor: '#a2d729',
    text: 'yene keno bet lol',
    upvotes: 1,
  },
  {
    username: 'w***d',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-12.png',
    avatarColor: '#ffb7b2',
    text: 'Rain dropped! 🎉',
    upvotes: 3,
  },
  {
    username: 'l***k',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-7.png',
    avatarColor: '#ffdab9',
    text: 'anyone hitting 7?',
    upvotes: 2,
  },
  {
    username: 'g***t',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-2.png',
    avatarColor: '#38bdf8',
    text: 'Fast Keno best game honestly',
    upvotes: 4,
  },
  {
    username: '09***63',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-9.png',
    avatarColor: '#b5ead7',
    text: 'minem ayidelem next round enashenifalen',
    upvotes: 3,
  },
  {
    username: 'e***m',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-4.png',
    avatarColor: '#F59E0B',
    text: '🔥 4 in a row!',
    upvotes: 5,
  },
  {
    username: 'r***s',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-14.png',
    avatarColor: '#71ce96',
    text: 'Good vibes only ✨',
    upvotes: 2,
  },
  {
    username: 'p***h',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-6.png',
    avatarColor: '#c7ceea',
    text: 'Who picked 1 and 80?',
    upvotes: 1,
  },
  {
    username: '07***52',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-10.png',
    avatarColor: '#a2d729',
    text: 'telebirr deposit was instant nice',
    upvotes: 4,
  },
  {
    username: 'k***a',
    avatarUrl: 'https://games.phoenixbet.io/fast-keno/assets/avatars/av-11.png',
    avatarColor: '#ffb7b2',
    text: '🎯 Keno Luck!',
    upvotes: 3,
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
      if (count < 20) {
        this.logger.log('Seeding initial authentic community chat messages...');
        const seedBaseTimestamp = Date.now() - 1000 * 60 * 35; // 35 mins ago
        for (let i = 0; i < INITIAL_STARTER_MESSAGES.length; i++) {
          const item = INITIAL_STARTER_MESSAGES[i]!;
          const msg = this.chatRepo.create({
            ...item,
            createdAt: new Date(seedBaseTimestamp + i * 45000),
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
