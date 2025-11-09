import { Controller, Post, Get, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { GroupsService } from './groups.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateGroupDto, UpdateGroupDto, AddMemberDto, UpdateMemberRoleDto, UpdateMemberStatusDto } from '../dto/group.dto';
import { Request } from 'express';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  async createGroup(@Body() createGroupDto: CreateGroupDto, @Req() req: any) {
    return this.groupsService.createGroup(req.user.userId, createGroupDto);
  }

  @Get()
  async getUserGroups(@Req() req: any) {
    return this.groupsService.getUserGroups(req.user.userId);
  }

  @Get(':id')
  async getGroupDetails(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroupDetails(id, req.user.userId);
  }

  @Patch(':id')
  async updateGroup(@Param('id') id: string, @Body() updateGroupDto: UpdateGroupDto, @Req() req: any) {
    return this.groupsService.updateGroup(id, req.user.userId, updateGroupDto);
  }

  @Delete(':id')
  async deleteGroup(@Param('id') id: string, @Req() req: any) {
    await this.groupsService.deleteGroup(id, req.user.userId);
    return { message: 'Group deleted successfully' };
  }

  @Post(':id/members')
  async addMember(@Param('id') id: string, @Body() addMemberDto: AddMemberDto, @Req() req: any) {
    return this.groupsService.addMember(id, addMemberDto, req.user.userId);
  }

  @Get(':id/members')
  async getGroupMembers(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroupMembers(id, req.user.userId);
  }

  @Delete(':id/members/:userId')
  async removeMember(@Param('id') id: string, @Param('userId') userId: string, @Req() req: any) {
    await this.groupsService.removeMember(id, userId, req.user.userId);
    return { message: 'Member removed successfully' };
  }

  @Post(':id/leave')
  async leave(@Param('id') id: string, @Req() req: any) {
    await this.groupsService.leaveGroup(id, req.user.userId);
    return { message: 'Left group successfully' };
  }

  @Patch(':id/members/:userId/role')
  async updateMemberRole(@Param('id') id: string, @Param('userId') userId: string, @Body() updateRoleDto: UpdateMemberRoleDto, @Req() req: any) {
    return this.groupsService.updateMemberRole(id, userId, updateRoleDto, req.user.userId);
  }

  @Patch(':id/members/:userId/status')
  async updateMemberStatus(@Param('id') id: string, @Param('userId') userId: string, @Body() updateStatusDto: UpdateMemberStatusDto, @Req() req: any) {
    return this.groupsService.updateMemberStatus(id, userId, updateStatusDto);
  }

  @Get(':id/status')
  async getGroupStatus(@Param('id') id: string, @Req() req: any) {
    return this.groupsService.getGroupStatusSummary(id, req.user.userId);
  }

  // Chat endpoints
  @Get(':id/messages')
  async listMessages(@Param('id') id: string, @Req() req: any) {
    const since = (req.query?.since as string) || undefined;
    return this.groupsService.listMessages(id, req.user.userId, since);
  }

  @Post(':id/messages')
  async sendMessage(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.groupsService.sendMessage(id, req.user.userId, req.user.username, body.text);
  }

  @Post(':id/share-alert')
  async shareAlert(@Param('id') id: string, @Body() body: { alertId: string }, @Req() req: any) {
    return this.groupsService.shareAlertToGroup(id, req.user.userId, req.user.username, body.alertId);
  }

  @Patch(':id/messages/:messageId')
  async updateMessage(@Param('id') id: string, @Param('messageId') messageId: string, @Body() body: { text: string }, @Req() req: any) {
    return this.groupsService.updateMessage(id, messageId, req.user.userId, body.text);
  }

  @Delete(':id/messages/:messageId')
  async deleteMessage(@Param('id') id: string, @Param('messageId') messageId: string, @Req() req: any) {
    await this.groupsService.deleteMessage(id, messageId, req.user.userId);
    return { message: 'Message deleted successfully' };
  }
}

