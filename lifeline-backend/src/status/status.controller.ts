import { Controller, Post, Get, Delete, Body, HttpCode, HttpStatus, Param, UseGuards, Request, ForbiddenException, BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusService } from './status.service';
import { CreateStatusDto } from '../dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('status')
export class StatusController {
  constructor(private readonly statusService: StatusService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createStatusDto: CreateStatusDto) {
    const status = await this.statusService.upsertSingleStatus({
      userId: createStatusDto.userId!,
      status: createStatusDto.status as any,
      timestamp: createStatusDto.timestamp,
      latitude: createStatusDto.latitude,
      longitude: createStatusDto.longitude,
      appendHistory: true,
    });
    return { success: true, data: status };
  }

  @Get('all')
  async findAll() {
    const statuses = await this.statusService.findAll();
    return { success: true, data: statuses };
  }

  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string) {
    const statuses = await this.statusService.findByUserId(userId);
    return { success: true, data: statuses };
  }

  @Get('user/:userId/latest')
  async findLatest(@Param('userId') userId: string) {
    const status = await this.statusService.findLatestByUserId(userId);
    return { success: true, data: status };
  }

  @Get('sync')
  async findAllForSync() {
    const statuses = await this.statusService.findAllForSync();
    return statuses;
  }

  // DELETE routes should come before the catch-all GET route
  @Delete('user/:userId/history/:timestamp')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async removeHistoryItem(
    @Request() req,
    @Param('userId') userId: string,
    @Param('timestamp') timestamp: string
  ) {
    console.log('🗑️ DELETE /status/user/:userId/history/:timestamp');
    console.log('  userId:', userId);
    console.log('  timestamp:', timestamp);
    console.log('  req.user.userId:', req.user?.userId);

    // Verify user owns this status
    // Convert both to strings for comparison (req.user.userId might be an ObjectId)
    const requestUserId = String(req.user.userId);
    const paramUserId = String(userId);
    
    if (requestUserId !== paramUserId) {
      console.log('❌ Forbidden: userId mismatch');
      console.log('  requestUserId:', requestUserId);
      console.log('  paramUserId:', paramUserId);
      throw new ForbiddenException('You can only delete your own status history');
    }

    const timestampNum = parseInt(timestamp, 10);
    if (isNaN(timestampNum)) {
      console.log('❌ Invalid timestamp:', timestamp);
      throw new BadRequestException('Invalid timestamp');
    }

    console.log('✅ Calling removeHistoryItem with timestamp:', timestampNum);
    const status = await this.statusService.removeHistoryItem(userId, timestampNum);
    if (!status) {
      console.log('❌ Status not found');
      throw new NotFoundException('Status not found');
    }

    console.log('✅ History item removed successfully');
    return { success: true, data: status };
  }

  @Delete('user/:userId/history')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async clearHistory(
    @Request() req,
    @Param('userId') userId: string
  ) {
    // Verify user owns this status
    // Convert both to strings for comparison (req.user.userId might be an ObjectId)
    const requestUserId = String(req.user.userId);
    const paramUserId = String(userId);
    
    if (requestUserId !== paramUserId) {
      throw new ForbiddenException('You can only clear your own status history');
    }

    const status = await this.statusService.clearHistory(userId);
    if (!status) {
      throw new NotFoundException('Status not found');
    }
    return { success: true, data: status };
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const status = await this.statusService.findById(id);
    return { success: true, data: status };
  }
}
