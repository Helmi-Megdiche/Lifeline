import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Types, Document } from 'mongoose';

export type InvitationDocument = Invitation & Document;

export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
}

@Schema({ timestamps: true })
export class Invitation {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  inviterId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  inviteeId: Types.ObjectId;

  @Prop({ enum: InvitationStatus, default: InvitationStatus.PENDING })
  status: InvitationStatus;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);
InvitationSchema.index({ groupId: 1, inviteeId: 1, status: 1 });

