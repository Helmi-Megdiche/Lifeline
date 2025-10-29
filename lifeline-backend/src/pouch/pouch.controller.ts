import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { StatusService } from '../status/status.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { CheckInStatus } from '../schemas/status.schema';
import type { Request, Response } from 'express';

interface BulkDocResult {
  id: string;
  rev?: string;
  ok?: boolean;
  error?: string;
  reason?: string;
}

@Controller('pouch')
export class PouchController {
  constructor(private readonly statusService: StatusService) {}

  private computeRevFromStatus(status: any): string {
    // Always return stored Couch-style _rev
    return status?._rev;
  }

  // CouchDB-compatible endpoints for PouchDB sync
  @Get()
  async getServerInfo(@Res() res: Response) {
    // Basic server info response expected by some PouchDB probes
    return res.json({ couchdb: 'Welcome', version: '3.3.0', ok: true });
  }
  @Get('status/_all_docs')
  async getAllDocs(@Query() query: any, @Res() res: Response) {
    try {
      const statuses = await this.statusService.findAllForSync();
      
      const response = {
        total_rows: statuses.length,
        offset: 0,
        rows: statuses.map(status => ({
          id: status._id,
          key: status._id,
          value: { rev: this.computeRevFromStatus(status) }
        }))
      };
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  // Database info probe (CouchDB-style)
  @Get('status')
  async getDbInfo(@Res() res: Response) {
    try {
      const statuses = await this.statusService.findAllForSync();
      return res.json({
        db_name: 'status',
        doc_count: statuses.length,
        update_seq: Date.now(),
        ok: true,
      });
    } catch (error) {
      return res.json({ db_name: 'status', doc_count: 0, update_seq: Date.now(), ok: true });
    }
  }

  // Also accept trailing slash for DB info
  @Get('status/')
  async getDbInfoSlash(@Res() res: Response) {
    return this.getDbInfo(res);
  }

  @UseGuards(JwtAuthGuard)
  @Post('status/_bulk_docs')
  async bulkDocs(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      
      const results: BulkDocResult[] = [];
      
      for (const doc of body.docs) {
        try {
          
          if (doc._deleted) {
            await this.statusService.delete(doc._id);
            results.push({ id: doc._id, rev: doc._rev, ok: true });
            continue;
          }

          const authedUserId = (req as any)?.user?.userId;
          if (!authedUserId || !doc.status || !doc.timestamp) {
            results.push({ id: doc._id, error: 'validation_error', reason: 'userId, status, timestamp required' });
            continue;
          }

          const updated = await this.statusService.upsertSingleStatus({
            userId: authedUserId,
            status: doc.status,
            timestamp: doc.timestamp,
            latitude: doc.latitude,
            longitude: doc.longitude,
            appendHistory: false,
          });
          results.push({ id: (updated._id as any).toString(), rev: updated._rev, ok: true });
        } catch (docError) {
          console.error('Error processing doc in bulk_docs:', doc, docError);
          results.push({
            id: doc._id,
            error: 'server_error',
            reason: docError.message
          });
        }
      }

      res.json(results);
    } catch (error) {
      console.error('Bulk docs error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/_changes')
  async getChanges(@Query() query: any, @Res() res: Response) {
    try {
      const statuses = await this.statusService.findAllForSync();
      const lastSeq = statuses.length > 0 ? statuses[0].timestamp : 0;

      const response = {
        results: statuses.map(s => ({
          seq: s.timestamp,
          id: s._id,
          changes: [{ rev: s._rev }],
          doc: s,
        })),
        last_seq: lastSeq,
        pending: 0,
      };
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/:id')
  async getDoc(@Param('id') id: string, @Res() res: Response) {
    try {
      const status = await this.statusService.findById(id);
      if (!status) {
        return res.status(404).json({ error: 'not_found', reason: 'missing' });
      }
      
      const response = {
        _id: (status._id as any).toString(),
        _rev: status._rev,
        status: status.status,
        timestamp: status.timestamp,
        latitude: status.latitude,
        longitude: status.longitude,
        userId: status.userId,
        synced: status.synced,
        createdAt: status.createdAt,
        updatedAt: status.updatedAt,
      };
      
      res.json(response);
    } catch (error) {
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  // Additional endpoints for PouchDB compatibility
  @UseGuards(JwtAuthGuard)
  @Post('status/_revs_diff')
  async revsDiff(@Body() body: any, @Req() req: Request, @Res() res: Response) {
    try {
      const response: Record<string, { missing: string[] }> = {};
      const userId = (req as any)?.user?.userId as string | undefined;
      const userIdStr = userId?.toString() || userId;
      const expectedDocId = userIdStr ? `user_${userIdStr}_status` : undefined;

      const ids = Object.keys(body || {});
      for (const clientDocId of ids) {
        // Only allow/consider the authenticated user's single doc
        if (expectedDocId && clientDocId !== expectedDocId) {
          continue;
        }

        const value = body[clientDocId];
        const clientRevs: string[] = Array.isArray(value)
          ? (value as string[])
          : Array.isArray(value?.revs)
            ? (value.revs as string[])
            : [];

        let existing;
        try {
          existing = expectedDocId
            ? await this.statusService.findById(expectedDocId)
            : await this.statusService.findById(clientDocId);
        } catch (error) {
          existing = null;
        }

        if (!existing) {
          // If doc doesn't exist server-side, all client revisions are missing
          response[clientDocId] = { missing: clientRevs.length ? clientRevs : ['1-0'] };
          continue;
        }

        // Check if client has revisions that server doesn't have
        const serverRev = existing._rev || '';
        if (!serverRev) {
          // Server has no revision, all client revs are missing
          response[clientDocId] = { missing: clientRevs.length ? clientRevs : ['1-0'] };
        } else {
          // Find client revisions that are newer than server revision
          const missingRevs = clientRevs.filter(clientRev => {
            // If client rev is not the same as server rev, it's potentially missing
            return clientRev !== serverRev;
          });
          
          if (missingRevs.length > 0) {
            response[clientDocId] = { missing: missingRevs };
          } else {
          }
        }
      }
      return res.json(response);
    } catch (error) {
      return res.json({});
    }
  }

  @UseGuards(JwtAuthGuard)
  @Put('status/:id')
  async updateDoc(@Param('id') id: string, @Body() doc: any, @Req() req: Request, @Res() res: Response) {
    try {
      
      const { _id, _rev, ...updateData } = doc;

      // Remove PouchDB-specific fields
      delete updateData._rev;

      const authedUserId = (req as any)?.user?.userId;
      if (!authedUserId || !updateData.status || !updateData.timestamp) {
        return res.status(400).json({ error: 'validation_error', reason: 'userId, status, timestamp required' });
      }
      const status = await this.statusService.upsertSingleStatus({
        userId: authedUserId,
        status: updateData.status,
        timestamp: updateData.timestamp,
        latitude: updateData.latitude,
        longitude: updateData.longitude,
        appendHistory: false,
      });

      const response = {
        ok: true,
        id: (status._id as any).toString(),
        rev: status._rev
      };

      res.json(response);
    } catch (error) {
     // console.error('Update doc error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  // Handle PUT requests without ID (for document creation)
  @UseGuards(JwtAuthGuard)
  @Put('status')
  async createDoc(@Body() doc: any, @Req() req: Request, @Res() res: Response) {
    try {
      // CouchDB semantics: PUT /{db} with empty body is used to create/check database
      if (!doc || (typeof doc === 'object' && Object.keys(doc).length === 0)) {
        // Respond as if database exists/created successfully
        // 201 is typical for created; 200 is acceptable if it already exists
        return res.status(201).json({ ok: true });
      }
      
      const { _id, _rev, ...createData } = doc;

      // Remove PouchDB-specific fields
      delete createData._rev;

      // Validate required fields
      const authedUserId = (req as any)?.user?.userId;
      if (!authedUserId || !createData.status || !createData.timestamp) {
       // console.error('Missing required fields in create:', { status: createData.status, timestamp: createData.timestamp });
        return res.status(400).json({ 
          error: 'validation_error', 
          reason: 'Missing required fields: userId, status and timestamp' 
        });
      }

      const status = await this.statusService.upsertSingleStatus({
        userId: authedUserId,
        status: createData.status,
        timestamp: createData.timestamp,
        latitude: createData.latitude,
        longitude: createData.longitude,
        appendHistory: false,
      });

      const response = {
        ok: true,
        id: (status._id as any).toString(),
        rev: status._rev
      };

      res.json(response);
    } catch (error) {
     // console.error('Create doc error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  // Handle POST requests for document creation (alternative to PUT)
  @UseGuards(JwtAuthGuard)
  @Post('status')
  async createDocPost(@Body() doc: any, @Req() req: Request, @Res() res: Response) {
    try {
      
      const { _id, _rev, ...createData } = doc;

      // Remove PouchDB-specific fields
      delete createData._rev;

      // Validate required fields
      const authedUserId = (req as any)?.user?.userId;
      if (!authedUserId || !createData.status || !createData.timestamp) {
       // console.error('Missing required fields in create POST:', { status: createData.status, timestamp: createData.timestamp });
        return res.status(400).json({ 
          error: 'validation_error', 
          reason: 'Missing required fields: userId, status and timestamp' 
        });
      }

      const status = await this.statusService.upsertSingleStatus({
        userId: authedUserId,
        status: createData.status,
        timestamp: createData.timestamp,
        latitude: createData.latitude,
        longitude: createData.longitude,
        appendHistory: false,
      });

      const response = {
        ok: true,
        id: (status._id as any).toString(),
        rev: status._rev
      };

      res.json(response);
    } catch (error) {
     //  console.error('Create doc POST error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  @UseGuards(JwtAuthGuard)
  @Get('status/_local/:id')
  async getLocalDoc(@Param('id') id: string, @Res() res: Response, @Req() req: Request) {
    res.status(404).json({ error: 'not_found', reason: 'missing' });
  }

  // Store checkpoint/local docs used by PouchDB sync
  @UseGuards(JwtAuthGuard)
  @Put('status/_local/:id')
  async putLocalDoc(@Param('id') id: string, @Body() body: any, @Res() res: Response, @Req() req: Request) {
    try {
      // We don't persist local docs server-side; acknowledge to satisfy Pouch
      return res.status(201).json({ ok: true, id, rev: '0-1' });
    } catch (error) {
      res.status(500).json({ error: 'internal_server_error', reason: (error as Error).message });
    }
  }

  // Minimal _bulk_get implementation for PouchDB compatibility
  @UseGuards(JwtAuthGuard)
  @Post('status/_bulk_get')
  async bulkGet(@Body() body: any, @Res() res: Response) {
    try {
      const results = await Promise.all((body.docs || []).map(async (req: any) => {
        try {
          const status = await this.statusService.findById(req.id);
          if (!status) {
            return { id: req.id, docs: [{ error: { error: 'not_found', reason: 'missing' } }] };
          }
          const doc = {
            _id: (status._id as any).toString(),
            _rev: status._rev,
            status: status.status,
            timestamp: status.timestamp,
            latitude: status.latitude,
            longitude: status.longitude,
            userId: status.userId,
            synced: status.synced,
            createdAt: status.createdAt,
            updatedAt: status.updatedAt,
          };
          return { id: req.id, docs: [{ ok: doc }] };
        } catch (e) {
          return { id: req.id, docs: [{ error: { error: 'internal_server_error', reason: (e as Error).message } }] };
        }
      }));

      return res.json({ results });
    } catch (error) {
      res.status(500).json({ error: 'internal_server_error', reason: (error as Error).message });
    }
  }
}
