import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ContactDocument = Contact & Document;

@Schema({ timestamps: true })
export class Contact {
  @Prop({ required: true }) userId: string;
  @Prop({ required: true }) name: string;
  @Prop({ required: true }) phone: string;
  @Prop() email?: string;
  @Prop({ default: true }) notify?: boolean;
  @Prop({ type: [String], default: ['sms', 'whatsapp'] }) methods?: string[];
}

export const ContactSchema = SchemaFactory.createForClass(Contact);


