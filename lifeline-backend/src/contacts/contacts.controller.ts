import { Controller, Get, Post, Body, Put, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ContactsService } from './contacts.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('contacts')
export class ContactsController {
  constructor(private svc: ContactsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() body: { name: string; phone: string; email?: string; methods?: string[] }, @Request() req: any) {
    return this.svc.create(req.user?.userId, body as any);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@Request() req: any) {
    return this.svc.findAll(req.user?.userId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Param('id') id: string, @Body() body: any, @Request() req: any) {
    return this.svc.update(req.user?.userId, id, body);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Param('id') id: string, @Request() req: any) {
    return this.svc.remove(req.user?.userId, id);
  }
}


