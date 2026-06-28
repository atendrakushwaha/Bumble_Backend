import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MatchDocument = Match & Document;

@Schema({ timestamps: true })
export class Match {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user1: Types.ObjectId; // The user who swiped

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  user2: Types.ObjectId; // The user being swiped on

  @Prop({ type: String, enum: ['like', 'pass', 'superlike'], required: true })
  action: string;

  @Prop({ default: false })
  isMutual: boolean; // True if both swiped right on each other
}

export const MatchSchema = SchemaFactory.createForClass(Match);
// Unique index to prevent duplicate swipes between the same pair
MatchSchema.index({ user1: 1, user2: 1 }, { unique: true });
