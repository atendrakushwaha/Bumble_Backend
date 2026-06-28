import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ChatService } from './chat.service';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Track online users mapping user ID to socket IDs
  private activeUsers = new Map<string, string>();

  constructor(
    private jwtService: JwtService,
    private chatService: ChatService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      // Get JWT token from the query parameters or handshake headers
      const token = client.handshake.query.token as string || client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token, {
        secret: process.env.JWT_SECRET || 'super-secret-key-dating-app-bumble-luxury-theme-2026',
      });

      client.data.userId = decoded.sub;
      this.activeUsers.set(decoded.sub, client.id);
      console.log(`[WebSocket] Client connected: ${client.id} (User: ${decoded.sub})`);
    } catch (err) {
      console.error('[WebSocket] Authentication failed. Disconnecting...', err.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.userId) {
      this.activeUsers.delete(client.data.userId);
      console.log(`[WebSocket] Client disconnected: ${client.id} (User: ${client.data.userId})`);
    }
  }

  @SubscribeMessage('join_chat')
  handleJoinChat(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    const currentUserId = client.data.userId;
    const targetUserId = data.targetUserId;

    // Create a unique room name by sorting both IDs
    const roomName = [currentUserId, targetUserId].sort().join('-');
    client.join(roomName);

    // Mark messages from targetUser as read
    this.chatService.markAsRead(targetUserId, currentUserId);

    console.log(`[WebSocket] User ${currentUserId} joined room ${roomName}`);
    return { status: 'success', room: roomName };
  }

  @SubscribeMessage('send_msg')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; content: string },
  ) {
    const senderId = client.data.userId;
    const { targetUserId, content } = data;

    // Save message in DB
    const savedMsg = await this.chatService.saveMessage(senderId, targetUserId, content);

    // Broadcast to the chat room
    const roomName = [senderId, targetUserId].sort().join('-');
    this.server.to(roomName).emit('new_msg', savedMsg);

    console.log(`[WebSocket] Message from ${senderId} to ${targetUserId}: "${content}" emitted in room ${roomName}`);
  }

  @SubscribeMessage('typing_state')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; isTyping: boolean },
  ) {
    const senderId = client.data.userId;
    const { targetUserId, isTyping } = data;

    const roomName = [senderId, targetUserId].sort().join('-');
    
    // Broadcast typing state to the room, excluding the sender
    client.to(roomName).emit('typing_state', {
      senderId,
      isTyping,
    });
  }

  @SubscribeMessage('call_user')
  handleCallUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; isVideo: boolean },
  ) {
    const senderId = client.data.userId;
    const { targetUserId, isVideo } = data;
    const roomName = [senderId, targetUserId].sort().join('-');

    client.to(roomName).emit('incoming_call', {
      callerId: senderId,
      isVideo,
    });
    console.log(`[WebSocket] Call initiated by ${senderId} to ${targetUserId} in room ${roomName}`);
  }

  @SubscribeMessage('accept_call')
  handleAcceptCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    const senderId = client.data.userId;
    const { targetUserId } = data;
    const roomName = [senderId, targetUserId].sort().join('-');

    client.to(roomName).emit('call_accepted', {
      calleeId: senderId,
    });
    console.log(`[WebSocket] Call accepted by ${senderId} from ${targetUserId} in room ${roomName}`);
  }

  @SubscribeMessage('reject_call')
  handleRejectCall(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string },
  ) {
    const senderId = client.data.userId;
    const { targetUserId } = data;
    const roomName = [senderId, targetUserId].sort().join('-');

    client.to(roomName).emit('call_rejected', {
      calleeId: senderId,
    });
    console.log(`[WebSocket] Call rejected by ${senderId} from ${targetUserId} in room ${roomName}`);
  }

  @SubscribeMessage('webrtc_offer')
  handleWebRtcOffer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; offer: any },
  ) {
    const senderId = client.data.userId;
    const { targetUserId, offer } = data;
    const roomName = [senderId, targetUserId].sort().join('-');

    client.to(roomName).emit('webrtc_offer', {
      senderId,
      offer,
    });
  }

  @SubscribeMessage('webrtc_answer')
  handleWebRtcAnswer(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; answer: any },
  ) {
    const senderId = client.data.userId;
    const { targetUserId, answer } = data;
    const roomName = [senderId, targetUserId].sort().join('-');

    client.to(roomName).emit('webrtc_answer', {
      senderId,
      answer,
    });
  }

  @SubscribeMessage('webrtc_ice_candidate')
  handleIceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { targetUserId: string; candidate: any },
  ) {
    const senderId = client.data.userId;
    const { targetUserId, candidate } = data;
    const roomName = [senderId, targetUserId].sort().join('-');

    client.to(roomName).emit('webrtc_ice_candidate', {
      senderId,
      candidate,
    });
  }
}
