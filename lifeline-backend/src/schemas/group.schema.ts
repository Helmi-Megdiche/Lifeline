import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type GroupDocument = Group & Document;
export type GroupMemberDocument = GroupMember & Document;

export enum GroupType {
  FAMILY = 'Family',
  FRIENDS = 'Friends',
  WORK = 'Work',
  OTHER = 'Other',
}

export enum MemberRole {
  ADMIN = 'admin',
  MEMBER = 'member',
}

@Schema({ timestamps: true })
export class Group {
  @Prop({ required: true })
  name: string;

  @Prop({ type: String, required: true })
  ownerId: string;

  @Prop()
  description?: string;

  @Prop({ enum: GroupType, default: GroupType.FAMILY })
  type: GroupType;

  createdAt?: Date;
  updatedAt?: Date;
}

@Schema({ timestamps: true })
export class GroupMember {
  @Prop({ type: Types.ObjectId, ref: 'Group', required: true })
  groupId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ enum: MemberRole, default: MemberRole.MEMBER })
  role: MemberRole;

  @Prop()
  status?: 'safe' | 'need_help' | 'in_danger' | 'offline' | 'unknown';

  @Prop()
  statusUpdatedAt?: Date;

  joinedAt?: Date;
}

export const GroupSchema = SchemaFactory.createForClass(Group);
export const GroupMemberSchema = SchemaFactory.createForClass(GroupMember);

// Create indexes
GroupSchema.index({ ownerId: 1 });
GroupSchema.index({ type: 1 });
GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });
GroupMemberSchema.index({ userId: 1 });
GroupMemberSchema.index({ status: 1 });

