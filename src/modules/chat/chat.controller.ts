import { Controller, Get, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ChatService } from './chat.service';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Get('messages/:receiverId')
  async getMessages(
    @Req() req: any,
    @Param('receiverId') receiverId: string,
  ) {
    const currentUserId = req.user._id.toString();
    return this.chatService.getMessageHistory(currentUserId, receiverId);
  }
}
