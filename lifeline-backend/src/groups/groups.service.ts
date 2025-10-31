import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Group, GroupDocument } from '../schemas/group.schema';
import { GroupMember, GroupMemberDocument } from '../schemas/group.schema';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto, UpdateMemberStatusDto } from '../dto/group.dto';
import { StatusService } from '../status/status.service';

@Injectable()
export class GroupsService {
  constructor(
    @InjectModel(Group.name) private groupModel: Model<GroupDocument>,
    @InjectModel(GroupMember.name) private memberModel: Model<GroupMemberDocument>,
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
    const member = await this.memberModel.findOne({ groupId, userId: userIdStr });
    if (!member || (member.role !== 'admin' && ownerIdStr !== userIdStr)) {
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
    
    // Check if admin user is a member with admin role or is the owner
    const adminMember = await this.memberModel.findOne({ groupId, userId: adminUserId });
    if (group.ownerId.toString() !== adminUserId && (!adminMember || adminMember.role !== 'admin')) {
      throw new ForbiddenException('Only admins can remove members');
    }
    
    // Cannot remove the owner
    if (targetUserId === group.ownerId.toString()) {
      throw new BadRequestException('Cannot remove the group owner');
    }
    
    await this.memberModel.deleteOne({ groupId, userId: targetUserId });
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

