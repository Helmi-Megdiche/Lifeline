import { Controller, Post, Get, Put, Delete, Body, Query, Param, UseGuards, Request, HttpCode, HttpStatus, NotFoundException, Res } from '@nestjs/common';
import { AlertsService } from './alerts.service';
import { CreateAlertDto, ReportAlertDto, AlertListDto } from '../dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Throttle } from '@nestjs/throttler';

@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get('test')
  async test() {
    return { message: 'Alerts controller is working' };
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 requests per minute
  @HttpCode(HttpStatus.CREATED)
  async createAlert(@Request() req, @Body() createAlertDto: CreateAlertDto) {
    const alert = await this.alertsService.createAlert(
      req.user.userId,
      req.user.username,
      createAlertDto
    );
    return { success: true, alert };
  }

  @Get()
  async getAlerts(@Query() alertListDto: AlertListDto) {
    const alerts = await this.alertsService.getAlerts(alertListDto);
    return { success: true, alerts };
  }

  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyAlerts(@Request() req) {
    const alerts = await this.alertsService.getUserAlerts(req.user.userId);
    return { success: true, alerts };
  }

  @Put(':id/report')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 reports per minute
  async reportAlert(@Request() req, @Param('id') alertId: string, @Body() reportAlertDto: ReportAlertDto) {
    const alert = await this.alertsService.reportAlert(alertId, req.user.userId, reportAlertDto);
    
    // Convert to plain object and remove MongoDB-specific fields for PouchDB compatibility
    const alertObj = JSON.parse(JSON.stringify(alert));
    delete alertObj.__v;
    
    return { success: true, alert: alertObj };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async deleteAlert(@Request() req, @Param('id') alertId: string) {
    await this.alertsService.deleteAlert(alertId, req.user.userId);
    return { success: true, message: 'Alert deleted successfully' };
  }

  // PouchDB-compatible endpoints
  @Get('pouch')
  @UseGuards(JwtAuthGuard)
  async pouchInfo(@Request() req) {
    return {
      db_name: 'alerts',
      doc_count: 0,
      update_seq: 0,
      purge_seq: 0,
      compact_running: false,
      sizes: {
        file: 0,
        external: 0,
        active: 0
      },
      instance_start_time: Date.now().toString(),
      disk_format_version: 6,
      committed_update_seq: 0,
      compacted_seq: 0,
      uuid: 'alerts-db-uuid',
      other: {
        data_size: 0
      }
    };
  }

  @Post('pouch/_bulk_docs')
  @UseGuards(JwtAuthGuard)
  async bulkDocs(@Request() req, @Body() body: any) {
    const results: any[] = [];
    
    for (const doc of body.docs) {
      try {
        // Only allow users to write their own alerts
        // Handle both string and ObjectId formats
        const docUserId = String(doc.userId);
        const reqUserId = String(req.user.userId);
        if (docUserId !== reqUserId) {
          results.push({ id: doc._id, error: 'forbidden' });
          continue;
        }
        

        // Add username from request context
        const docWithUsername = {
          ...doc,
          username: req.user.username
        };
        
        const alert = await this.alertsService.upsertAlert(docWithUsername);
        results.push({ 
          id: alert._id, 
          rev: alert._rev,
          ok: true 
        });
      } catch (error: any) {
        results.push({ 
          id: doc._id, 
          error: error.message || 'unknown_error' 
        });
      }
    }

    return results;
  }

  @Get('pouch/_changes')
  @UseGuards(JwtAuthGuard)
  async changes(@Request() req, @Query() query: any) {
    const since = query.since || '0';
    
    // For initial sync (since=0), return empty results to allow PouchDB to push
    if (since === '0') {
      return {
        results: [],
        last_seq: '0'
      };
    }
    
    const alerts = await this.alertsService.getAlertsForSync(since);
    
    const changes = alerts.map(alert => ({
      seq: alert.createdAt.getTime(),
      id: alert._id,
      changes: [{ rev: alert._rev }]
    }));

    return {
      results: changes,
      last_seq: changes.length > 0 ? changes[changes.length - 1].seq : since
    };
  }

  @Post('pouch/_revs_diff')
  @UseGuards(JwtAuthGuard)
  async revsDiff(@Request() req, @Body() body: any) {
    // Return empty object for now - PouchDB will handle missing docs
    return {};
  }

  // Handle _local documents for PouchDB replication checkpoints
  @Get('pouch/_local/:docId')
  @UseGuards(JwtAuthGuard)
  async getLocalDoc(@Request() req, @Param('docId') docId: string, @Res() res: any) {
    // Return 404 for _local documents - PouchDB will create them as needed
    return res.status(404).json({ error: 'not_found', reason: 'missing' });
  }

  @Put('pouch/_local/:docId')
  @UseGuards(JwtAuthGuard)
  async putLocalDoc(@Request() req, @Param('docId') docId: string, @Body() body: any, @Res() res: any) {
    // Accept _local documents for replication checkpoints
    return res.status(201).json({
      ok: true,
      id: docId,
      rev: body._rev || '1-' + Date.now()
    });
  }

  // Handle individual document requests
  @Get('pouch/:docId')
  @UseGuards(JwtAuthGuard)
  async getDoc(@Request() req, @Param('docId') docId: string, @Query() query: any) {
    
    try {
      const alert = await this.alertsService.getAlertById(docId, req.user.userId);
      if (!alert) {
        throw new NotFoundException('Document not found');
      }
      return alert;
    } catch (error) {
      throw new NotFoundException('Document not found');
    }
  }

  // Handle _bulk_get requests
  @Post('pouch/_bulk_get')
  @UseGuards(JwtAuthGuard)
  async bulkGet(@Request() req, @Body() body: any) {
    
    const results: any[] = [];
    
    for (const request of body.docs) {
      try {
        const alert = await this.alertsService.getAlertById(request.id, req.user.userId);
        if (alert) {
          results.push({
            id: request.id,
            docs: [alert]
          });
        } else {
          results.push({
            id: request.id,
            docs: []
          });
        }
      } catch (error) {
        results.push({
          id: request.id,
          docs: []
        });
      }
    }
    
    return { results };
  }

  // Handle _all_docs requests
  @Get('pouch/_all_docs')
  @UseGuards(JwtAuthGuard)
  async allDocs(@Request() req, @Query() query: any) {
    
    try {
      const alerts = await this.alertsService.getUserAlerts(req.user.userId);
      const rows = alerts.map(alert => ({
        id: alert._id,
        key: alert._id,
        value: {
          rev: alert._rev
        }
      }));
      
      return {
        total_rows: rows.length,
        offset: 0,
        rows: rows
      };
    } catch (error) {
      return {
        total_rows: 0,
        offset: 0,
        rows: []
      };
    }
  }
}
