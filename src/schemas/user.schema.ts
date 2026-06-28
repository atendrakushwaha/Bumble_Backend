import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ _id: false })
class AgePreference {
  @Prop({ default: 18 })
  min: number;

  @Prop({ default: 50 })
  max: number;
}

@Schema({ _id: false })
class LocationPoint {
  @Prop({ type: String, enum: ['Point'], default: 'Point' })
  type: string;

  @Prop({ type: [Number], required: true }) // [longitude, latitude]
  coordinates: number[];
}

@Schema({ timestamps: true })
export class User {
  @Prop({ unique: true, sparse: true })
  phone?: string;

  @Prop({ unique: true, sparse: true })
  email?: string;

  @Prop()
  name: string;

  @Prop()
  birthDate: Date;

  @Prop({ enum: ['male', 'female', 'other'] })
  gender: string;

  @Prop()
  bio: string;

  @Prop({ type: [String], default: [] })
  photos: string[];

  @Prop({ type: [String], default: [] })
  hobbies: string[];

  @Prop({ type: [String], default: [] })
  languages: string[];

  @Prop({ type: LocationPoint, index: '2dsphere' })
  location: LocationPoint;

  @Prop({ type: AgePreference, default: () => ({ min: 18, max: 50 }) })
  agePreference: AgePreference;

  @Prop({ default: 50 }) // Default 50 km
  distancePreference: number;

  @Prop({ enum: ['male', 'female', 'both', 'everyone'], default: 'everyone' })
  genderPreference: string;

  @Prop()
  voicePrompt: string; // URL or path to recorded voice note

  @Prop({ default: false })
  isVerified: boolean;

  @Prop({ type: [String], default: [] })
  preferredLanguages: string[]; // Preferred match languages
}

export const UserSchema = SchemaFactory.createForClass(User);
