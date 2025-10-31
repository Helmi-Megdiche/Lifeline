import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CheckInStatus } from '../schemas/status.schema';
import { CreateStatusDto } from '../dto';

@Injectable()
export class StatusService {
  constructor(
    @InjectModel(CheckInStatus.name) private statusModel: Model<CheckInStatus>,
  ) {}

  // Single-doc upsert keyed by userId; _id is user_<userId>_status
  async upsertSingleStatus(params: {
    userId: string;
    status: 'safe' | 'help';
    timestamp: number;
    latitude?: number;
    longitude?: number;
    appendHistory?: boolean;
  }): Promise<CheckInStatus> {
    const { userId, status, timestamp, latitude, longitude, appendHistory } = params;
    const _id = `user_${userId}_status`;
    const existing = await this.statusModel.findOne({ _id }).exec();
    if (existing) {
      const nextRev = this.bumpRev(existing._rev);
      
      // Always append to history if requested
      if (appendHistory) {
        existing.statusHistory = existing.statusHistory || [];
        existing.statusHistory.push({ status, timestamp });
      }
      
      // Only update main status fields if incoming timestamp is newer
      if (timestamp > existing.timestamp) {
        existing.status = status;
        existing.timestamp = timestamp;
        existing.latitude = latitude;
        existing.longitude = longitude;
        existing.synced = true;
        existing._rev = nextRev;
        return existing.save();
      } else {
        // Return existing document without saving - no changes to persist
        return existing;
      }
    }
    const initialRev = '1-' + this.hash(`${_id}:${timestamp}:${status}`);
    const created = new this.statusModel({
      _id,
      userId,
      status,
      timestamp,
      latitude,
      longitude,
      synced: true,
      _rev: initialRev,
      statusHistory: appendHistory ? [{ status, timestamp }] : [],
    });
    return created.save();
  }

  private bumpRev(current?: string): string {
    if (!current) return '1-' + this.hash(Date.now().toString());
    const match = current.match(/^(\d+)-(.+)$/);
    if (!match) return '1-' + this.hash(Date.now().toString());
    const gen = parseInt(match[1], 10) + 1;
    return `${gen}-${this.hash(current + ':' + Date.now())}`;
  }

  private hash(s: string): string {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = (h << 5) - h + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16);
  }

  async findAll(): Promise<CheckInStatus[]> {
    return this.statusModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByUserId(userId: string): Promise<CheckInStatus[]> {
    return this.statusModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findLatestByUserId(userId: string): Promise<CheckInStatus | null> {
    // Single-document per user; return that
    const doc = await this.statusModel.findOne({ userId }).exec();
    return doc;
  }

  async findById(id: string): Promise<CheckInStatus | null> {
    // Support non-ObjectId string _id
    return this.statusModel.findOne({ _id: id }).exec();
  }

  async findOneByTimestampAndUserId(timestamp: number, userId?: string): Promise<CheckInStatus | null> {
    const query: any = { timestamp };
    if (userId) {
      query.userId = userId;
    }
    return this.statusModel.findOne(query).exec();
  }

  async update(id: string, updateData: Partial<CheckInStatus>): Promise<CheckInStatus | null> {
    const doc = await this.statusModel.findById(id).exec();
    if (!doc) return null;
    const nextRev = this.bumpRev(doc._rev);
    Object.assign(doc, updateData, { synced: true, _rev: nextRev });
    return doc.save();
  }

  async delete(id: string): Promise<CheckInStatus | null> {
    return this.statusModel.findByIdAndDelete(id).exec();
  }

  // For PouchDB sync compatibility
  async findAllForSync(): Promise<any[]> {
    const statuses = await this.statusModel.find().exec();
    return statuses.map(status => ({
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
    }));
  }

  async findByUserIds(userIds: string[]): Promise<CheckInStatus[]> {
    if (!userIds || userIds.length === 0) return [] as any;
    const docs = await this.statusModel.find({ userId: { $in: userIds } }).lean();
    return docs as any;
  }
}
