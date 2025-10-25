import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type AlertDocument = Alert & Document;

@Schema({ timestamps: true })
export class Alert {
  @Prop({ required: true })
  _id: string;

  @Prop({ required: true })
  _rev: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  username: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ 
    required: true,
    type: {
      lat: { type: Number, required: true },
      lng: { type: Number, required: true },
      address: { type: String, required: false }
    }
  })
  location: {
    lat: number;
    lng: number;
    address?: string;
  };

  @Prop({ required: true })
  severity: 'low' | 'medium' | 'high' | 'critical';

  @Prop({ default: 'active' })
  status: 'active' | 'resolved' | 'false_alarm';

  @Prop({ default: 0 })
  reportCount: number;

  @Prop({ default: [] })
  reportedBy: string[];

  @Prop({ required: true })
  dedupHash: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  synced: boolean;

  @Prop({ default: false })
  hidden: boolean;
}

export const AlertSchema = SchemaFactory.createForClass(Alert);

// TTL index for automatic cleanup
AlertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Compound indexes for efficient querying
AlertSchema.index({ category: 1, status: 1 });
AlertSchema.index({ 'location.lat': 1, 'location.lng': 1 });
AlertSchema.index({ dedupHash: 1 }, { unique: true });
AlertSchema.index({ userId: 1, createdAt: -1 });
AlertSchema.index({ createdAt: -1 });
