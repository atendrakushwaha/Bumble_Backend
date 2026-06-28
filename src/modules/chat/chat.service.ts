import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from '../../schemas/message.schema';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async getMessageHistory(user1: string, user2: string): Promise<MessageDocument[]> {
    const user1Id = new Types.ObjectId(user1);
    const user2Id = new Types.ObjectId(user2);

    return this.messageModel
      .find({
        $or: [
          { sender: user1Id, receiver: user2Id },
          { sender: user2Id, receiver: user1Id },
        ],
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  async saveMessage(senderId: string, receiverId: string, content: string): Promise<MessageDocument> {
    const message = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      content,
      isRead: false,
    });
    return message.save();
  }

  async markAsRead(senderId: string, receiverId: string): Promise<any> {
    return this.messageModel.updateMany(
      {
        sender: new Types.ObjectId(senderId),
        receiver: new Types.ObjectId(receiverId),
        isRead: false,
      },
      { $set: { isRead: true } },
    );
  }
}
