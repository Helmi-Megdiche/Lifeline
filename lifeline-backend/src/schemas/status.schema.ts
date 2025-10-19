import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class CheckInStatus extends Document {
  // Single-document per user model; string _id (e.g., user_<userId>_status)
  declare _id: string;

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

  @Prop({ required: true, index: { unique: true } })
  userId: string;

  @Prop()
  _rev?: string; // For PouchDB compatibility

  @Prop({ type: [{ status: String, timestamp: Number }], default: [] })
  statusHistory?: { status: string; timestamp: number }[];

  // Timestamps are automatically added by Mongoose
  createdAt?: Date;
  updatedAt?: Date;
}

export const CheckInStatusSchema = SchemaFactory.createForClass(CheckInStatus);

// Configure _id to be a string instead of ObjectId
CheckInStatusSchema.set('_id', false);
CheckInStatusSchema.add({ _id: { type: String, required: true } });
