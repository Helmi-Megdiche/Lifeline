import { Injectable, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invitation, InvitationDocument, InvitationStatus } from '../schemas/invitation.schema';
import { Group, GroupDocument, GroupMember, GroupMemberDocument } from '../schemas/group.schema';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(Invitation.name) private invitationModel: Model<InvitationDocument>,
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMember.name) private memberModel: Model<GroupMemberDocument>,
  ) {}

  async createInvitation(groupId: string, inviterId: string, inviteeId: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');

    const inviterStr = inviterId.toString();
    const isOwner = (group.ownerId as any).toString() === inviterStr;
    const adminMember = await this.memberModel.findOne({ groupId: group._id, userId: inviterStr });
    if (!isOwner && (!adminMember || adminMember.role !== 'admin')) {
      throw new ForbiddenException('Only group owners/admins can invite');
    }

    // If already a member, do not create invite
    const existingMember = await this.memberModel.findOne({ groupId: group._id, userId: inviteeId });
    if (existingMember) throw new BadRequestException('User is already a member');

    // Find existing pending invite
    const pending = await this.invitationModel.findOne({ groupId: group._id, inviteeId, status: InvitationStatus.PENDING });
    if (pending) return pending;

    const invite = new this.invitationModel({
      groupId: group._id,
      inviterId: new Types.ObjectId(inviterId),
      inviteeId: new Types.ObjectId(inviteeId),
      status: InvitationStatus.PENDING,
    });
    return invite.save();
  }

  async listMyInvitations(userId: string) {
    return this.invitationModel
      .find({ inviteeId: userId, status: InvitationStatus.PENDING })
      .populate('groupId', 'name description ownerId');
  }

  async getInvitationPreview(invitationId: string, userId: string) {
    const invite = await this.invitationModel
      .findById(invitationId)
      .populate('groupId', 'name description ownerId');
    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.inviteeId.toString() !== userId.toString()) throw new ForbiddenException('Not your invitation');

    const group = await this.groupModel.findById(invite.groupId);
    if (!group) throw new NotFoundException('Group not found');

    const members = await this.memberModel
      .find({ groupId: group._id })
      .populate('userId', 'username email');

    return {
      group: {
        id: group._id,
        name: group.name,
        description: (group as any).description,
        ownerId: group.ownerId,
      },
      members: members.map((m: any) => ({
        id: m._id,
        user: m.userId,
        role: m.role,
      })),
    };
  }

  async acceptInvitation(invitationId: string, userId: string) {
    const invite = await this.invitationModel.findById(invitationId);
    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.inviteeId.toString() !== userId.toString()) throw new ForbiddenException('Not your invitation');
    if (invite.status !== InvitationStatus.PENDING) throw new BadRequestException('Invitation is not pending');

    // Create member
    const exists = await this.memberModel.findOne({ groupId: invite.groupId, userId: userId });
    if (!exists) {
      await this.memberModel.create({ groupId: invite.groupId, userId: userId, role: 'member', status: 'unknown' });
    }

    invite.status = InvitationStatus.ACCEPTED;
    await invite.save();
    return { success: true };
  }

  async declineInvitation(invitationId: string, userId: string) {
    const invite = await this.invitationModel.findById(invitationId);
    if (!invite) throw new NotFoundException('Invitation not found');
    if (invite.inviteeId.toString() !== userId.toString()) throw new ForbiddenException('Not your invitation');
    if (invite.status !== InvitationStatus.PENDING) throw new BadRequestException('Invitation is not pending');

    invite.status = InvitationStatus.DECLINED;
    await invite.save();
    return { success: true };
  }
}


