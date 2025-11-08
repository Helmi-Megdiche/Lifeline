import { Controller, Post, UseInterceptors, UploadedFile, Body, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VoiceAlertService } from './voice-alert.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('voice-alert')
export class VoiceAlertController {
  constructor(private svc: VoiceAlertService) {}

  @Post('process')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  async processAudio(@UploadedFile() file: any, @Body() body: any, @Request() req: any) {
    if (!file) throw new BadRequestException('audio file required');
    
    const userId = req.user?.userId;
    const latitude = body.latitude ? parseFloat(body.latitude) : undefined;
    const longitude = body.longitude ? parseFloat(body.longitude) : undefined;
    const clientTranscript = body.transcript || undefined; // Client-side transcript from browser SpeechRecognition

    // Log received data for debugging
    console.log('🎤 Voice alert received:', {
      userId,
      fileSize: file.buffer?.length || 0,
      fileMimetype: file.mimetype,
      latitude,
      longitude,
      hasClientTranscript: !!clientTranscript
    });

    // Validate audio file
    if (!file.buffer || file.buffer.length === 0) {
      throw new BadRequestException('Audio file is empty or invalid');
    }

    // Validate coordinates - reject if missing or invalid (0,0 is Null Island, not a real location)
    if (latitude === undefined || longitude === undefined || 
        isNaN(latitude) || isNaN(longitude) || 
        (latitude === 0 && longitude === 0)) {
      throw new BadRequestException('Valid location coordinates (latitude/longitude) are required for voice alerts');
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      throw new BadRequestException('Invalid coordinate values: latitude must be between -90 and 90, longitude between -180 and 180');
    }

    try {
      const result = await this.svc.processAudio(userId, file.buffer, latitude, longitude, clientTranscript);
      console.log('✅ Voice alert processed successfully:', { transcript: result.transcript, category: result.ai?.category });
      return { success: true, ...result };
    } catch (error: any) {
      console.error('❌ Voice alert processing failed:', error);
      throw error;
    }
  }

  @Post('testNotify')
  @UseGuards(JwtAuthGuard)
  async testNotify(@Body() body: { latitude?: number; longitude?: number }, @Request() req: any) {
    const demoAudio = Buffer.from('demo');
    const res = await this.svc.processAudio(req.user?.userId, demoAudio, body.latitude, body.longitude);
    return { success: true, res };
  }
}


