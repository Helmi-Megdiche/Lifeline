import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class Message extends Document {
  @Prop({ type: Types.ObjectId, required: true, index: true })
  groupId!: Types.ObjectId;

  @Prop({ required: true })
  userId!: string; // string user id

  @Prop({ required: true })
  username!: string;

  @Prop({ required: true, trim: true, maxlength: 2000 })
  text!: string;

  // Alert sharing fields
  @Prop({ type: String, required: false })
  alertId?: string;

  @Prop({ type: Object, required: false })
  alertData?: {
    _id: string;
    category: string;
    title: string;
    description: string;
    location: {
      lat: number;
      lng: number;
      address?: string;
    };
    severity: string;
    username: string;
    createdAt: string;
  };

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);


