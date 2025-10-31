import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  // Create invitation (owner/admin)
  @Post('groups/:id/invitations')
  async create(@Param('id') groupId: string, @Body('inviteeId') inviteeId: string, @Req() req: any) {
    const invite = await this.invitationsService.createInvitation(groupId, req.user.userId, inviteeId);
    return { success: true, data: invite };
  }

  // List my pending invitations
  @Get('invitations')
  async listMine(@Req() req: any) {
    const invites = await this.invitationsService.listMyInvitations(req.user.userId);
    return { success: true, data: invites };
  }

  // Accept
  @Post('invitations/:id/accept')
  async accept(@Param('id') id: string, @Req() req: any) {
    return this.invitationsService.acceptInvitation(id, req.user.userId);
  }

  // Decline
  @Post('invitations/:id/decline')
  async decline(@Param('id') id: string, @Req() req: any) {
    return this.invitationsService.declineInvitation(id, req.user.userId);
  }

  // Preview invitation's group (for invitee)
  @Get('invitations/:id/preview')
  async preview(@Param('id') id: string, @Req() req: any) {
    const data = await this.invitationsService.getInvitationPreview(id, req.user.userId);
    return { success: true, data };
  }
}


