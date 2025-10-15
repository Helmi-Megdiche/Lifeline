import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, Res } from '@nestjs/common';
import { StatusService } from '../status/status.service';
import { Types } from 'mongoose';
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
          value: { rev: status._rev || '1-' + Date.now() }
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

  @Post('status/_bulk_docs')
  async bulkDocs(@Body() body: any, @Res() res: Response) {
    try {
      const results: BulkDocResult[] = [];
      
      console.log('PouchDB bulk_docs received:', JSON.stringify(body, null, 2));
      
      for (const doc of body.docs) {
        try {
          console.log('Processing doc:', JSON.stringify(doc, null, 2));
          
          if (doc._deleted) {
            // Handle deletion
            await this.statusService.delete(doc._id);
            results.push({ id: doc._id, rev: doc._rev, ok: true });
          } else {
            // Validate required fields
            if (!doc.status || !doc.timestamp) {
              console.error('Missing required fields:', { status: doc.status, timestamp: doc.timestamp });
              results.push({
                id: doc._id,
                error: 'validation_error',
                reason: 'Missing required fields: status and timestamp'
              });
              continue;
            }
            
            // Check if doc already exists by id or by (timestamp,userId) to avoid duplicates
            let existingStatus: CheckInStatus | null = null;
            if (doc._id && Types.ObjectId.isValid(doc._id)) {
              existingStatus = await this.statusService.findById(doc._id);
            }
            if (!existingStatus && doc.timestamp) {
              existingStatus = await this.statusService.findOneByTimestampAndUserId(doc.timestamp, doc.userId);
            }
            
            if (existingStatus) {
              // Update existing document
              const updatedStatus = await this.statusService.update(doc._id, {
                status: doc.status,
                timestamp: doc.timestamp,
                latitude: doc.latitude,
                longitude: doc.longitude,
                userId: doc.userId,
              });
              if (updatedStatus) {
                results.push({ 
                  id: (updatedStatus._id as Types.ObjectId).toString(), 
                  rev: updatedStatus._rev || '1-' + Date.now(), 
                  ok: true 
                });
              }
            } else {
              // Create new document preserving client _id to avoid duplicates
              const newStatus = await this.statusService.create({
                _id: doc._id,
                status: doc.status,
                timestamp: doc.timestamp,
                latitude: doc.latitude,
                longitude: doc.longitude,
                userId: doc.userId,
              } as any);
              results.push({
                id: (newStatus._id as Types.ObjectId).toString(),
                rev: newStatus._rev || '1-' + Date.now(),
                ok: true
              });
            }
          }
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

  @Get('status/_changes')
  async getChanges(@Query() query: any, @Res() res: Response) {
    try {
      const statuses = await this.statusService.findAllForSync();
      const lastSeq = statuses.length > 0 ? statuses[0].timestamp : 0;

      const response = {
        results: statuses.map(s => ({
          seq: s.timestamp,
          id: s._id,
          changes: [{ rev: s._rev || '1-' + Date.now() }],
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

  @Get('status/:id')
  async getDoc(@Param('id') id: string, @Res() res: Response) {
    try {
      const status = await this.statusService.findById(id);
      if (!status) {
        return res.status(404).json({ error: 'not_found', reason: 'missing' });
      }
      
      const response = {
        _id: (status._id as Types.ObjectId).toString(),
        _rev: status._rev || '1-' + Date.now(),
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
  @Post('status/_revs_diff')
  async revsDiff(@Body() body: any, @Res() res: Response) {
    // Return empty object for now - PouchDB will handle this
    res.json({});
  }

  @Put('status/:id')
  async updateDoc(@Param('id') id: string, @Body() doc: any, @Res() res: Response) {
    try {
      console.log('PouchDB PUT updateDoc:', { id, doc: JSON.stringify(doc, null, 2) });
      
      const { _id, _rev, ...updateData } = doc;

      // Remove PouchDB-specific fields
      delete updateData._rev;

      // Validate required fields if provided (creation path requires them)
      const hasRequired = updateData.status && updateData.timestamp;

      // Try update first
      let status = await this.statusService.update(id, updateData);

      // If not found, create a new one preserving the _id
      if (!status) {
        if (!hasRequired) {
          console.error('Missing required fields in create via PUT:', { status: updateData.status, timestamp: updateData.timestamp });
          return res.status(400).json({ 
            error: 'validation_error', 
            reason: 'Missing required fields: status and timestamp' 
          });
        }
        status = await this.statusService.create({
          _id: id,
          ...updateData,
        } as any);
      }

      const response = {
        ok: true,
        id: (status._id as Types.ObjectId).toString(),
        rev: status._rev || '1-' + Date.now()
      };

      res.json(response);
    } catch (error) {
      console.error('Update doc error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  // Handle PUT requests without ID (for document creation)
  @Put('status')
  async createDoc(@Body() doc: any, @Res() res: Response) {
    try {
      console.log('PouchDB PUT createDoc:', JSON.stringify(doc, null, 2));
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
      if (!createData.status || !createData.timestamp) {
        console.error('Missing required fields in create:', { status: createData.status, timestamp: createData.timestamp });
        return res.status(400).json({ 
          error: 'validation_error', 
          reason: 'Missing required fields: status and timestamp' 
        });
      }

      const status = await this.statusService.create(createData);

      const response = {
        ok: true,
        id: (status._id as Types.ObjectId).toString(),
        rev: status._rev || '1-' + Date.now()
      };

      res.json(response);
    } catch (error) {
      console.error('Create doc error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  // Handle POST requests for document creation (alternative to PUT)
  @Post('status')
  async createDocPost(@Body() doc: any, @Res() res: Response) {
    try {
      console.log('PouchDB POST createDoc:', JSON.stringify(doc, null, 2));
      
      const { _id, _rev, ...createData } = doc;

      // Remove PouchDB-specific fields
      delete createData._rev;

      // Validate required fields
      if (!createData.status || !createData.timestamp) {
        console.error('Missing required fields in create POST:', { status: createData.status, timestamp: createData.timestamp });
        return res.status(400).json({ 
          error: 'validation_error', 
          reason: 'Missing required fields: status and timestamp' 
        });
      }

      const status = await this.statusService.create(createData);

      const response = {
        ok: true,
        id: (status._id as Types.ObjectId).toString(),
        rev: status._rev || '1-' + Date.now()
      };

      res.json(response);
    } catch (error) {
      console.error('Create doc POST error:', error);
      res.status(500).json({ error: 'internal_server_error', reason: error.message });
    }
  }

  @Get('status/_local/:id')
  async getLocalDoc(@Param('id') id: string, @Res() res: Response) {
    res.status(404).json({ error: 'not_found', reason: 'missing' });
  }

  // Store checkpoint/local docs used by PouchDB sync
  @Put('status/_local/:id')
  async putLocalDoc(@Param('id') id: string, @Body() body: any, @Res() res: Response) {
    try {
      // We don't persist local docs server-side; acknowledge to satisfy Pouch
      return res.status(201).json({ ok: true, id, rev: '0-1' });
    } catch (error) {
      res.status(500).json({ error: 'internal_server_error', reason: (error as Error).message });
    }
  }

  // Minimal _bulk_get implementation for PouchDB compatibility
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
            _id: (status._id as Types.ObjectId).toString(),
            _rev: status._rev || '1-' + Date.now(),
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
