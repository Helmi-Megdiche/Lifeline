import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export interface EmergencyContact {
  id: string;
  name: string;
  phone: string;
  relationship?: string;
  updatedAt: Date;
}

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, sparse: true })
  username: string;

  @Prop({ required: true })
  password: string;

  // Keep email field for backward compatibility but make it optional
  @Prop({ required: false, unique: true, sparse: true })
  email?: string;

  @Prop({
    type: [{
      id: { type: String, required: true },
      name: { type: String, required: true },
      phone: { type: String, required: true },
      relationship: { type: String, required: false },
      updatedAt: { type: Date, required: true },
    }],
    default: [],
  })
  emergencyContacts?: EmergencyContact[];
}

export const UserSchema = SchemaFactory.createForClass(User);
