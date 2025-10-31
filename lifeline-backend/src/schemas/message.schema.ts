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

  createdAt?: Date;
  updatedAt?: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);


