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

  async create(createStatusDto: CreateStatusDto): Promise<CheckInStatus> {
    const status = new this.statusModel({ ...createStatusDto, synced: true });
    return status.save();
  }

  async findAll(): Promise<CheckInStatus[]> {
    return this.statusModel.find().sort({ createdAt: -1 }).exec();
  }

  async findByUserId(userId: string): Promise<CheckInStatus[]> {
    return this.statusModel.find({ userId }).sort({ createdAt: -1 }).exec();
  }

  async findById(id: string): Promise<CheckInStatus | null> {
    return this.statusModel.findById(id).exec();
  }

  async findOneByTimestampAndUserId(timestamp: number, userId?: string): Promise<CheckInStatus | null> {
    const query: any = { timestamp };
    if (userId) {
      query.userId = userId;
    }
    return this.statusModel.findOne(query).exec();
  }

  async update(id: string, updateData: Partial<CheckInStatus>): Promise<CheckInStatus | null> {
    return this.statusModel
      .findByIdAndUpdate(id, { ...updateData, synced: true }, { new: true })
      .exec();
  }

  async delete(id: string): Promise<CheckInStatus | null> {
    return this.statusModel.findByIdAndDelete(id).exec();
  }

  // For PouchDB sync compatibility
  async findAllForSync(): Promise<any[]> {
    const statuses = await this.statusModel.find().exec();
    return statuses.map(status => ({
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
    }));
  }
}
