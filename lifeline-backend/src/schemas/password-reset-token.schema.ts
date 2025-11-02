import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class PasswordResetToken extends Document {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop()
  otp?: string; // OTP code for email verification

  @Prop({ required: true })
  expiresAt: Date;

  @Prop({ default: false })
  used: boolean;

  @Prop({ default: false })
  otpVerified: boolean; // Track if OTP has been verified
}

export const PasswordResetTokenSchema = SchemaFactory.createForClass(PasswordResetToken);

// Add index for automatic cleanup of expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
