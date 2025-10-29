import { Controller, Post, Get, Body, HttpCode, HttpStatus, Param } from '@nestjs/common';
import { StatusService } from './status.service';
import { CreateStatusDto } from '../dto';

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

  @Get('sync')
  async findAllForSync() {
    const statuses = await this.statusService.findAllForSync();
    return statuses;
  }

  @Get(':id')
  async findById(@Param('id') id: string) {
    const status = await this.statusService.findById(id);
    return { success: true, data: status };
  }
}
