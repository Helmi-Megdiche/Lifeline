import { Injectable, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Alert, AlertDocument } from '../schemas/alert.schema';
import { CreateAlertDto, ReportAlertDto, AlertListDto } from '../dto';
import * as crypto from 'crypto';

@Injectable()
export class AlertsService {
  constructor(
    @InjectModel(Alert.name) private alertModel: Model<AlertDocument>,
  ) {}

  async createAlert(userId: string, username: string, createAlertDto: CreateAlertDto): Promise<Alert> {
    // Generate deduplication hash
    const dedupHash = this.generateDedupHash(createAlertDto);
    
    // Check for duplicate alerts within the last hour
    const existingAlert = await this.alertModel.findOne({
      dedupHash,
      createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      status: 'active'
    }).exec();

    if (existingAlert) {
      throw new ConflictException('Similar alert already exists');
    }

    // Calculate TTL (default 24 hours)
    const ttlHours = createAlertDto.ttlHours || 24;
    const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000);

    // Generate document ID
    const alertId = `alert_${userId}_${Date.now()}`;
    const rev = `1-${crypto.randomBytes(16).toString('hex')}`;

    const alert = new this.alertModel({
      _id: alertId,
      _rev: rev,
      userId,
      username,
      ...createAlertDto,
      dedupHash,
      expiresAt,
      synced: false,
    });

    return await alert.save();
  }

  async getAlerts(alertListDto: AlertListDto): Promise<Alert[]> {
    const query: any = {
      status: 'active',
      hidden: false,
      expiresAt: { $gt: new Date() }
    };

    // Bounding box filter
    if (alertListDto.minLat !== undefined && alertListDto.maxLat !== undefined &&
        alertListDto.minLng !== undefined && alertListDto.maxLng !== undefined) {
      query['location.lat'] = {
        $gte: alertListDto.minLat,
        $lte: alertListDto.maxLat
      };
      query['location.lng'] = {
        $gte: alertListDto.minLng,
        $lte: alertListDto.maxLng
      };
    }

    // Category filter
    if (alertListDto.category) {
      query.category = alertListDto.category;
    }

    // Severity filter
    if (alertListDto.severity) {
      query.severity = alertListDto.severity;
    }

    const limit = alertListDto.limit || 50;

    return await this.alertModel
      .find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async reportAlert(alertId: string, userId: string, reportAlertDto: ReportAlertDto): Promise<Alert> {
    const alert = await this.alertModel.findById(alertId).exec();
    
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // Check if user already reported this alert
    if (alert.reportedBy.includes(userId)) {
      throw new BadRequestException('You have already reported this alert');
    }

    // Update report count and hide if threshold reached
    alert.reportedBy.push(userId);
    alert.reportCount = alert.reportedBy.length;

    // Hide alert if it gets too many reports (threshold: 5)
    if (alert.reportCount >= 5) {
      alert.hidden = true;
      alert.status = 'false_alarm';
    }

    return await alert.save();
  }

  async addComment(alertId: string, userId: string, username: string, comment: string): Promise<Alert> {
    const alert = await this.alertModel.findById(alertId).exec();
    
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    // Add comment
    if (!alert.comments) {
      alert.comments = [];
    }
    
    alert.comments.push({
      userId,
      username,
      comment,
      createdAt: new Date()
    });

    return await alert.save();
  }

  async updateComment(alertId: string, commentIndex: number, userId: string, newComment: string): Promise<Alert> {
    const alert = await this.alertModel.findById(alertId).exec();
    
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (!alert.comments || !alert.comments[commentIndex]) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns this comment (compare as strings to handle ObjectId/string mismatch)
    if (String(alert.comments[commentIndex].userId) !== String(userId)) {
      throw new BadRequestException('You can only edit your own comments');
    }

    // Update comment
    alert.comments[commentIndex].comment = newComment;

    return await alert.save();
  }

  async deleteComment(alertId: string, commentIndex: number, userId: string): Promise<Alert> {
    const alert = await this.alertModel.findById(alertId).exec();
    
    if (!alert) {
      throw new NotFoundException('Alert not found');
    }

    if (!alert.comments || !alert.comments[commentIndex]) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns this comment (compare as strings to handle ObjectId/string mismatch)
    if (String(alert.comments[commentIndex].userId) !== String(userId)) {
      throw new BadRequestException('You can only delete your own comments');
    }

    // Remove comment
    alert.comments.splice(commentIndex, 1);

    return await alert.save();
  }

  async getUserAlerts(userId: string): Promise<Alert[]> {
    return await this.alertModel
      .find({ userId })
      .sort({ createdAt: -1 })
      .exec();
  }

  async deleteAlert(alertId: string, userId: string): Promise<void> {
    const alert = await this.alertModel.findOne({ _id: alertId, userId }).exec();
    
    if (!alert) {
      throw new NotFoundException('Alert not found or access denied');
    }

    await this.alertModel.deleteOne({ _id: alertId }).exec();
  }

  async upsertAlert(alertData: any): Promise<Alert> {
    // Upsert alert (create or update)
    
    // Normalize the alert data to match schema requirements
    const normalizedData = {
      ...alertData,
      // Convert latitude/longitude to location object if needed
      location: alertData.location || {
        lat: alertData.latitude,
        lng: alertData.longitude,
        address: alertData.address || ''
      },
      // Generate dedupHash if missing
      dedupHash: alertData.dedupHash || this.generateDedupHash({
        location: {
          lat: alertData.latitude || alertData.location?.lat,
          lng: alertData.longitude || alertData.location?.lng
        },
        category: alertData.category,
        title: alertData.title,
        description: alertData.description,
        severity: alertData.severity || 'medium'
      }),
      // Generate _rev if missing
      _rev: alertData._rev || `1-${crypto.randomBytes(16).toString('hex')}`,
      // Set username if missing (we'll get it from the request context)
      username: alertData.username || 'unknown',
      // Ensure synced is true for PouchDB sync
      synced: true
    };
    
    // Normalize the data for MongoDB
    
    const existingAlert = await this.alertModel.findById(alertData._id).exec();
    
    if (existingAlert) {
      // Update existing alert
      Object.assign(existingAlert, normalizedData);
      existingAlert.synced = true;
      const updatedAlert = await existingAlert.save();
      return updatedAlert;
    } else {
      // Create new alert
      const alert = new this.alertModel(normalizedData);
      const savedAlert = await alert.save();
      return savedAlert;
    }
  }

  async getAlertsForSync(since?: string): Promise<Alert[]> {
    const query: any = { synced: true };
    
    if (since) {
      query.createdAt = { $gt: new Date(since) };
    }

    return await this.alertModel
      .find(query)
      .sort({ createdAt: 1 })
      .exec();
  }

  async getAlertById(alertId: string, userId: string): Promise<Alert | null> {
    
    try {
      const alert = await this.alertModel.findOne({
        _id: alertId,
        userId: userId
      }).exec();
      
      if (alert) {
        return alert;
      } else {
        return null;
      }
    } catch (error) {
      return null;
    }
  }

  private generateDedupHash(createAlertDto: CreateAlertDto): string {
    const data = {
      category: createAlertDto.category,
      lat: Math.round(createAlertDto.location.lat * 100) / 100, // Round to 2 decimal places
      lng: Math.round(createAlertDto.location.lng * 100) / 100,
      title: createAlertDto.title.toLowerCase().trim()
    };
    
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }
}
