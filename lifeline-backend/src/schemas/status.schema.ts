import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

@Schema({ timestamps: true })
export class CheckInStatus extends Document {
  @Prop({ required: true })
  status: 'safe' | 'help';

  @Prop({ required: true })
  timestamp: number;

  @Prop() 
  latitude?: number;

  @Prop() 
  longitude?: number;

  @Prop({ default: false })
  synced?: boolean;

  @Prop() 
  userId?: string;

  @Prop()
  _rev?: string; // For PouchDB compatibility

  // Timestamps are automatically added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const CheckInStatusSchema = SchemaFactory.createForClass(CheckInStatus);
