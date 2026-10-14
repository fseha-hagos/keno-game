import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import { ChatService } from './chat.service';

@Controller('api/v1/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  async getMessages(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 60;
    return this.chatService.getRecentMessages(parsedLimit);
  }

  @Post('messages')
  async createMessage(
    @Body()
    body: {
      userId?: string;
      username?: string;
      avatarUrl?: string;
      avatarColor?: string;
      text: string;
    },
    @Req() req: any,
  ) {
    // If authenticated user is in request, default to user info
    const userId = body.userId || req.user?.id;
    const username = body.username || req.user?.username || 'Player';

    return this.chatService.createMessage({
      userId,
      username,
      avatarUrl: body.avatarUrl,
      avatarColor: body.avatarColor,
      text: body.text,
    });
  }

  @Post('messages/:id/like')
  async likeMessage(@Param('id') id: string) {
    return this.chatService.likeMessage(id);
  }
}
