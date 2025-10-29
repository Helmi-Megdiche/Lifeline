import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true, sparse: true })
  username: string;

  @Prop({ required: true })
  password: string;

  // Keep email field for backward compatibility but make it optional
  @Prop({ required: false, unique: true, sparse: true })
  email?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);
