import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { GroupMember, GroupMemberDocument } from '../schemas/group.schema';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto, UpdateMemberStatusDto } from '../dto/group.dto';
import { StatusService } from '../status/status.service';
import { Message } from '../schemas/message.schema';
import { Alert, AlertDocument } from '../schemas/alert.schema';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMember.name) private memberModel: Model<GroupMemberDocument>,
    @InjectModel(Message.name) private messageModel: Model<any>,
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
    private readonly statusService: StatusService,
  ) {}

  async createGroup(userId: string, createGroupDto: CreateGroupDto): Promise<GroupDocument> {
    const userIdStr = userId.toString();
    
    const group = new this.groupModel({
      ...createGroupDto,
      ownerId: userIdStr, // Store as string
    });
    
    const savedGroup = await group.save();
    console.log('✅ Created group:', savedGroup._id, 'for owner:', userIdStr);
    
    // Automatically add the creator as an admin member
    // Use ObjectId for groupId and userId to match schema
    const memberRecord = await this.memberModel.create({
      groupId: savedGroup._id, // ObjectId
      userId: userId, // ObjectId
      role: 'admin',
      status: 'unknown',
    });
    
    console.log('✅ Created member record:', memberRecord._id, 'for user:', userIdStr, 'in group:', (savedGroup._id as any).toString());
    
    return savedGroup;
  }

  // Group chat
  async listMessages(groupId: string, userId: string, since?: string) {
    // authorize: user must be owner or member
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    const userIdStr = userId.toString();
    const isOwner = (group.ownerId as any).toString() === userIdStr;
    const member = await this.memberModel.findOne({
      $or: [
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: group._id, userId: userIdStr },
      ],
    });
    if (!isOwner && !member) throw new ForbiddenException('You are not a member of this group');

    const query: any = { groupId: new Types.ObjectId(groupId) };
    if (since) {
      const t = new Date(since);
      if (!isNaN(t.getTime())) query.createdAt = { $gt: t };
    }
    const msgs = await this.messageModel.find(query).sort({ createdAt: 1 }).limit(200).lean();
    return msgs.map(m => ({
      id: (m._id as any).toString(),
      userId: m.userId,
      username: m.username,
      text: m.text,
      createdAt: m.createdAt,
      alertId: (m as any).alertId,
      alertData: (m as any).alertData,
    }));
  }

  async sendMessage(groupId: string, userId: string, username: string, text: string) {
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    const userIdStr = userId.toString();
    const isOwner = (group.ownerId as any).toString() === userIdStr;
    const member = await this.memberModel.findOne({
      $or: [
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: group._id, userId: userIdStr },
      ],
    });
    if (!isOwner && !member) throw new ForbiddenException('You are not a member of this group');
    if (!text || !text.trim()) throw new BadRequestException('Message is empty');

    const doc = await this.messageModel.create({
      groupId: new Types.ObjectId(groupId),
      userId: userIdStr,
      username,
      text: text.trim().slice(0, 2000),
    });
    return {
      id: (doc._id as any).toString(),
      userId: doc.userId,
      username: doc.username,
      text: doc.text,
      createdAt: doc.createdAt,
      alertId: doc.alertId,
      alertData: doc.alertData,
    };
  }

  async updateMessage(groupId: string, messageId: string, userId: string, text: string) {
    // Verify group exists and user is a member
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    
    const userIdStr = userId.toString();
    const isOwner = (group.ownerId as any).toString() === userIdStr;
    const member = await this.memberModel.findOne({
      $or: [
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: group._id, userId: userIdStr },
      ],
    });
    if (!isOwner && !member) throw new ForbiddenException('You are not a member of this group');

    // Find the message
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    // Verify the message belongs to this group
    if (message.groupId.toString() !== groupId) {
      throw new ForbiddenException('Message does not belong to this group');
    }

    // Verify the user owns the message
    if (message.userId !== userIdStr) {
      throw new ForbiddenException('You can only edit your own messages');
    }

    // Update the message (only text, not alert messages)
    if (message.alertId) {
      throw new BadRequestException('Cannot edit shared alert messages');
    }

    if (!text || !text.trim()) throw new BadRequestException('Message is empty');

    message.text = text.trim().slice(0, 2000);
    await message.save();

    return {
      id: (message._id as any).toString(),
      userId: message.userId,
      username: message.username,
      text: message.text,
      createdAt: message.createdAt,
      alertId: message.alertId,
      alertData: message.alertData,
    };
  }

  async deleteMessage(groupId: string, messageId: string, userId: string) {
    // Verify group exists and user is a member
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    
    const userIdStr = userId.toString();
    const isOwner = (group.ownerId as any).toString() === userIdStr;
    const member = await this.memberModel.findOne({
      $or: [
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: group._id, userId: userIdStr },
      ],
    });
    if (!isOwner && !member) throw new ForbiddenException('You are not a member of this group');

    // Find the message
    const message = await this.messageModel.findById(messageId);
    if (!message) throw new NotFoundException('Message not found');

    // Verify the message belongs to this group
    if (message.groupId.toString() !== groupId) {
      throw new ForbiddenException('Message does not belong to this group');
    }

    // Verify the user owns the message
    if (message.userId !== userIdStr) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    // Delete the message (this only deletes the chat message, not the alert itself if it's a shared alert)
    await this.messageModel.deleteOne({ _id: messageId });
    return { message: 'Message deleted successfully' };
  }

  async shareAlertToGroup(groupId: string, userId: string, username: string, alertId: string) {
    // Verify group exists and user is a member
    const group = await this.groupModel.findById(groupId);
    if (!group) throw new NotFoundException('Group not found');
    
    const userIdStr = userId.toString();
    const isOwner = (group.ownerId as any).toString() === userIdStr;
    const member = await this.memberModel.findOne({
      $or: [
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: group._id, userId: userIdStr },
      ],
    });
    if (!isOwner && !member) throw new ForbiddenException('You are not a member of this group');

    // Fetch the alert
    const alert = await this.alertModel.findById(alertId).lean();
    if (!alert) throw new NotFoundException('Alert not found');

    // Prepare alert data for sharing
    const alertData = {
      _id: alert._id,
      category: alert.category,
      title: alert.title,
      description: alert.description,
      location: alert.location,
      severity: alert.severity,
      username: alert.username,
      createdAt: alert.createdAt?.toISOString() || new Date().toISOString(),
    };

    // Create a message with alert data
    const messageText = `🚨 Shared Alert: ${alert.title}\n\n${alert.description || 'No description'}\n\n📍 Location: ${alert.location?.address || `${alert.location?.lat}, ${alert.location?.lng}`}\n\nSeverity: ${alert.severity.toUpperCase()}`;

    const doc = await this.messageModel.create({
      groupId: new Types.ObjectId(groupId),
      userId: userIdStr,
      username,
      text: messageText,
      alertId: alert._id,
      alertData: alertData,
    });

    return {
      id: (doc._id as any).toString(),
      userId: doc.userId,
      username: doc.username,
      text: doc.text,
      createdAt: doc.createdAt,
      alertId: doc.alertId,
      alertData: doc.alertData,
    };
  }

  async getUserGroups(userId: string): Promise<any[]> {
    // Convert userId to string for comparison
    const userIdStr = userId.toString();
    console.log('📋 getUserGroups called for userId:', userIdStr);
    
    // Get groups where user is the owner
    // Handle both ObjectId and String types for backward compatibility
    const ownedGroups = await this.groupModel.find({ 
      $or: [
        { ownerId: userId }, // For ObjectId fields
        { ownerId: userIdStr } // For String fields
      ]
    });
    console.log('📊 Found owned groups:', ownedGroups.length);
    const ownedGroupIds = ownedGroups.map(g => (g._id as any).toString());
    
    // Get groups where user is a member
    // Handle both ObjectId and String types
    const memberGroups = await this.memberModel.find({ 
      $or: [
        { userId: userId },
        { userId: userIdStr }
      ]
    }).select('groupId role');
    console.log('👥 Found member groups:', memberGroups.length);
    const memberGroupIds = memberGroups.map(m => m.groupId.toString());
    
    // Combine and deduplicate group IDs
    const allGroupIds = [...new Set([...ownedGroupIds, ...memberGroupIds])];
    console.log('🔗 Total unique group IDs:', allGroupIds.length);
    
    const groups = await this.groupModel.find({ _id: { $in: allGroupIds } }).sort({ createdAt: -1 });
    console.log('✅ Returning', groups.length, 'groups');

    // Compute member counts per group in a legacy-safe way (handles string or ObjectId groupId)
    const groupIdToCount: Record<string, number> = {};
    await Promise.all(groups.map(async (g) => {
      const gid = (g._id as any);
      const gidStr = gid.toString();
      const cnt = await this.memberModel.countDocuments({
        $or: [
          { groupId: gid },
          // Legacy records may have stored groupId as string
          { groupId: gidStr },
        ],
      });
      groupIdToCount[gidStr] = cnt;
    }));

    // Enrich groups with member info and isAdmin status
    const enriched = groups.map(group => {
      const groupIdStr = (group._id as any).toString();
      
      // Find members of THIS specific group
      const groupMembers = memberGroups.filter(m => {
        const memberGroupId = m.groupId.toString();
        return memberGroupId === groupIdStr;
      });
      
      const memberInfo = groupMembers[0];
      const isOwner = (group.ownerId as any).toString() === userIdStr;
      
      // Count actual members for this group (from aggregation)
      const memberCount = groupIdToCount[groupIdStr] ?? 0;
      
      const result = {
        ...group.toObject(),
        isAdmin: isOwner || memberInfo?.role === 'admin',
        memberCount: memberCount,
      };
      console.log('📦 Group:', result.name, 'isAdmin:', result.isAdmin, 'memberCount:', memberCount);
      return result;
    });
    
    return enriched;
  }

  async getGroupDetails(groupId: string, userId: string): Promise<any> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const ownerIdStr = (group.ownerId as any).toString();
    const userIdStr = userId.toString();
    const isOwner = ownerIdStr === userIdStr;
    // Find requesting user's member entry, if present
    const member = await this.memberModel.findOne({
      $or: [
        { groupId: groupId, userId: userId },
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId.toString(), userId: userId },
        { groupId: groupId.toString(), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: group._id, userId: new Types.ObjectId(userIdStr) }
      ]
    });
    if (!isOwner && !member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    const members = await this.memberModel.find({
      $or: [
        { groupId: groupId },
        { groupId: group._id }
      ]
    }).populate('userId', 'username email');

    // Fix memberUserIds list:
    const memberUserIds = members
      .map(m => {
        if (m.userId && typeof m.userId === 'object' && '_id' in m.userId && m.userId._id) {
          return String(m.userId._id);
        }
        if (typeof m.userId === 'string') {
          return m.userId;
        }
        return undefined;
      })
      .filter((id): id is string => typeof id === 'string');
    // Batch fetch all statuses for group users via StatusService
    const statusDocs = await this.statusService.findByUserIds(memberUserIds);
    // Map userId => latest status (or undefined)
    const userIdToStatus = new Map<string, string>();
    statusDocs.forEach((doc: any) => {
      let normStatus = doc.status === 'help' ? 'need_help' : (doc.status === 'safe' ? 'safe' : doc.status);
      userIdToStatus.set(String(doc.userId), normStatus || 'unknown');
    });

    // Build normalized status counts from global statuses
    const statusCounts = { safe: 0, need_help: 0, in_danger: 0, offline: 0, unknown: 0 } as Record<string, number>;

    console.log('[getGroupDetails] Returning members array:', members.map(m => {
      const memberUserId = (m.userId && typeof m.userId === 'object' && '_id' in m.userId && m.userId._id)
        ? String(m.userId._id)
        : (typeof m.userId === 'string' ? m.userId : undefined);
      const globalStatus = (memberUserId && userIdToStatus.get(memberUserId)) || 'unknown';
      return {
        id: memberUserId,
        username: (m.userId && typeof m.userId === 'object' && 'username' in m.userId)
          ? (m.userId as any).username
          : undefined,
        statusReturned: globalStatus
      };
    }));

    return {
      ...group.toObject(),
      members: members.map(m => {
        const memberUserId = (m.userId && typeof m.userId === 'object' && '_id' in m.userId && m.userId._id) ? String(m.userId._id) : (typeof m.userId === 'string' ? m.userId : undefined);
        const globalStatus = (memberUserId && userIdToStatus.get(memberUserId)) || 'unknown';
        if (statusCounts[globalStatus] !== undefined) {
          statusCounts[globalStatus]++;
        } else {
          statusCounts.unknown++;
        }
        return {
          _id: m._id,
          userId: m.userId,
          role: m.role,
          status: globalStatus, // always latest global
          statusUpdatedAt: m.statusUpdatedAt,
          joinedAt: m.joinedAt,
        };
      }),
      memberCount: members.length,
      statusCounts,
      isAdmin: member?.role === 'admin' || isOwner,
    };
  }

  async updateGroup(groupId: string, userId: string, updateGroupDto: UpdateGroupDto): Promise<GroupDocument> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    const userIdStr = userId.toString();
    const ownerIdStr = (group.ownerId as any).toString();
    
    // Check if user is the owner or an admin
    const member = await this.memberModel.findOne({ 
      $or: [
        { groupId: groupId, userId: userIdStr },
        { groupId: groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
        { groupId: group._id, userId: userIdStr },
      ]
    });
    if ((!member || member.role !== 'admin') && ownerIdStr !== userIdStr) {
      throw new ForbiddenException('You do not have permission to update this group');
    }
    
    Object.assign(group, updateGroupDto);
    return group.save();
  }

  async deleteGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    // Convert both to strings for comparison
    const ownerIdStr = (group.ownerId as any).toString();
    const userIdStr = userId.toString();
    
    console.log('🗑️ deleteGroup - groupId:', groupId);
    console.log('📊 ownerId:', ownerIdStr);
    console.log('👤 userId:', userIdStr);
    
    // Check if user is owner
    const isOwner = ownerIdStr === userIdStr;
    console.log('✅ Is owner:', isOwner);
    
    // Check if user is admin member
    const member = await this.memberModel.findOne({ 
      groupId: groupId, 
      userId: userIdStr 
    });
    const isAdmin = member?.role === 'admin';
    console.log('👑 Is admin:', isAdmin);
    
    // Only owner or admin can delete
    if (!isOwner && !isAdmin) {
      console.log('❌ Permission denied');
      throw new ForbiddenException('Only the group owner or admins can delete this group');
    }
    
    // Delete all members
    await this.memberModel.deleteMany({ groupId });
    
    // Delete the group
    await this.groupModel.findByIdAndDelete(groupId);
    
    console.log(`✅ Deleted group ${groupId} by user ${userIdStr}`);
  }

  async addMember(groupId: string, addMemberDto: AddMemberDto, adminUserId: string): Promise<GroupMemberDocument> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    // Convert both to strings for comparison
    const ownerIdStr = (group.ownerId as any).toString();
    const adminUserIdStr = adminUserId.toString();
    
    // Check if user is the owner
    const isOwner = ownerIdStr === adminUserIdStr;
    
    // Check if user is a member with admin role
    const adminMember = await this.memberModel.findOne({ 
      groupId, 
      $or: [
        { userId: adminUserId },
        { userId: adminUserIdStr }
      ]
    });
    
    // Allow if user is owner OR admin member
    if (!isOwner && (!adminMember || adminMember.role !== 'admin')) {
      throw new ForbiddenException('Only group owners and admins can add members');
    }
    
    // Check if user is already a member
    const existingMember = await this.memberModel.findOne({
      groupId,
      userId: addMemberDto.userId,
    });
    
    if (existingMember) {
      throw new BadRequestException('User is already a member of this group');
    }
    
    const member = new this.memberModel({
      groupId,
      userId: addMemberDto.userId,
      role: 'member',
      status: 'unknown',
    });
    
    return member.save();
  }

  async removeMember(groupId: string, targetUserId: string, adminUserId: string): Promise<void> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    // Convert to strings for consistent comparison
    const ownerIdStr = (group.ownerId as any).toString();
    const adminUserIdStr = adminUserId.toString();
    const targetUserIdStr = targetUserId.toString();
    
    // Check if admin user is the owner
    const isOwner = ownerIdStr === adminUserIdStr;
    
    // Check if admin user is a member with admin role
    const adminMember = await this.memberModel.findOne({ 
      groupId, 
      $or: [
        { userId: adminUserId },
        { userId: adminUserIdStr }
      ]
    });
    
    const isAdminMember = adminMember && adminMember.role === 'admin';
    
    // Only allow if user is owner OR admin member
    if (!isOwner && !isAdminMember) {
      throw new ForbiddenException('Only admins can remove members');
    }
    
    // Cannot remove the owner
    if (targetUserIdStr === ownerIdStr) {
      throw new BadRequestException('Cannot remove the group owner');
    }
    
    // Convert to ObjectId for consistent MongoDB queries
    let groupIdObj: Types.ObjectId;
    let targetUserIdObj: Types.ObjectId;
    
    try {
      groupIdObj = new Types.ObjectId(groupId);
    } catch (error) {
      console.error(`Invalid groupId format: ${groupId}`);
      throw new BadRequestException('Invalid group ID format');
    }
    
    try {
      targetUserIdObj = new Types.ObjectId(targetUserId);
    } catch (error) {
      console.error(`Invalid userId format: ${targetUserId}`);
      throw new BadRequestException('Invalid user ID format');
    }
    
    // Verify member exists before deletion using ObjectId
    const memberToDelete = await this.memberModel.findOne({
      groupId: groupIdObj,
      userId: targetUserIdObj
    });
    
    if (!memberToDelete) {
      
      // Try one more time with string format in case of any type mismatch
      const memberCheck = await this.memberModel.findOne({
        $or: [
          { groupId: groupIdObj, userId: targetUserIdObj },
          { groupId: groupId, userId: targetUserId },
          { groupId: groupId, userId: targetUserIdStr }
        ]
      });
      
      if (!memberCheck) {
        throw new NotFoundException('Member not found in this group');
      }
      
      // If found with alternative query, use the found document's IDs
      const foundGroupId = memberCheck.groupId.toString();
      const foundUserId = memberCheck.userId.toString();
      
      // Delete using the found IDs
      const deleteResult = await this.memberModel.deleteOne({ 
        _id: memberCheck._id
      });
      
      if (deleteResult.deletedCount === 0) {
        throw new NotFoundException('Failed to remove member from group');
      }
            return;
    }
    
    // Delete the member using ObjectId (standard path)
    const deleteResult = await this.memberModel.deleteOne({ 
      _id: memberToDelete._id
    });
    
    if (deleteResult.deletedCount === 0) {
      console.error(`❌ Failed to delete member ${targetUserIdStr} from group ${groupId}`);
      throw new NotFoundException('Failed to remove member from group');
    }
    
    console.log(`✅ Removed member ${targetUserIdStr} from group ${groupId} by admin ${adminUserIdStr}`);
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    const userIdStr = userId.toString();
    const ownerIdStr = (group.ownerId as any).toString();
    // If owner and there are other members, forbid leaving
    if (ownerIdStr === userIdStr) {
      const members = await this.memberModel.countDocuments({ groupId });
      if (members > 0) {
        throw new ForbiddenException('Owner cannot leave while other members remain. Transfer ownership or delete the group.');
      }
    }
    await this.memberModel.deleteOne({
      $or: [
        { groupId, userId: userIdStr },
        { groupId: new Types.ObjectId(groupId), userId: userIdStr },
        { groupId, userId: new Types.ObjectId(userIdStr) },
        { groupId: new Types.ObjectId(groupId), userId: new Types.ObjectId(userIdStr) },
      ],
    });
  }

  async updateMemberRole(groupId: string, targetUserId: string, updateRoleDto: UpdateMemberRoleDto, adminUserId: string): Promise<GroupMemberDocument> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    // Check if admin user is the owner (only owner can change roles)
    if (group.ownerId.toString() !== adminUserId) {
      throw new ForbiddenException('Only the group owner can change roles');
    }
    
    const member = await this.memberModel.findOne({ groupId, userId: targetUserId });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    
    member.role = updateRoleDto.role;
    return member.save();
  }

  async updateMemberStatus(groupId: string, userId: string, updateStatusDto: UpdateMemberStatusDto): Promise<GroupMemberDocument> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    const userIdStr = userId.toString();
    const member = await this.memberModel.findOne({ groupId, userId: userIdStr });
    if (!member) {
      throw new NotFoundException('You are not a member of this group');
    }
    
    member.status = updateStatusDto.status;
    member.statusUpdatedAt = new Date();
    return member.save();
  }

  async getGroupMembers(groupId: string, userId: string): Promise<any[]> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    const userIdStr = userId.toString();
    const ownerIdStr = (group.ownerId as any).toString();
    
    // Check if user is owner
    const isOwner = ownerIdStr === userIdStr;
    
    // Check if user is a member
    const member = await this.memberModel.findOne({ groupId, userId: userIdStr });
    
    // Allow if user is owner OR member
    if (!isOwner && !member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    
    const members = await this.memberModel.find({ groupId }).populate('userId', 'username email');
    return members.map(m => m.toObject());
  }

  // Get status summary for a group
  async getGroupStatusSummary(groupId: string, userId: string): Promise<any> {
    const group = await this.groupModel.findById(groupId);
    if (!group) {
      throw new NotFoundException('Group not found');
    }
    
    const userIdStr = userId.toString();
    const ownerIdStr = (group.ownerId as any).toString();
    
    // Check if user is owner
    const isOwner = ownerIdStr === userIdStr;
    
    // Check if user is a member
    const member = await this.memberModel.findOne({ groupId, userId: userIdStr });
    
    // Allow if user is owner OR member
    if (!isOwner && !member) {
      throw new ForbiddenException('You are not a member of this group');
    }
    
    const members = await this.memberModel.find({ groupId });
    
    const statusCounts = {
      safe: 0,
      need_help: 0,
      in_danger: 0,
      offline: 0,
      unknown: 0,
    };
    
    members.forEach(m => {
      if (m.status && statusCounts[m.status as keyof typeof statusCounts] !== undefined) {
        statusCounts[m.status as keyof typeof statusCounts]++;
      } else {
        statusCounts.unknown++;
      }
    });
    
    return {
      totalMembers: members.length,
      statusCounts,
    };
  }
}

