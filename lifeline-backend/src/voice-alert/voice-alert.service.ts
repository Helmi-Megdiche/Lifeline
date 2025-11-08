import { Injectable, Logger } from '@nestjs/common';
import { SttService } from './stt/stt.service';
import { ClassifierService } from './intents/classifier.service';
import { ContactsService } from '../contacts/contacts.service';
import { TwilioNotifierService } from '../notifier/twilio-notifier.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateAlertDto } from '../dto/alert.dto';

@Injectable()
export class VoiceAlertService {
  private logger = new Logger(VoiceAlertService.name);

  constructor(
    private stt: SttService,
    private classifier: ClassifierService,
    private contactsService: ContactsService,
    private notifier: TwilioNotifierService,
    private alertsService: AlertsService,
  ) {}

  async processAudio(userId: string, audioBuffer: Buffer, latitude?: number, longitude?: number, clientTranscript?: string) {
    this.logger.log(`Processing voice alert for user ${userId}, audio size: ${audioBuffer.length} bytes`);
    
    let transcript: string;
    
    // Use client-side transcript if available (from browser SpeechRecognition API)
    if (clientTranscript && clientTranscript.trim()) {
      transcript = clientTranscript.trim().toLowerCase();
      this.logger.log(`Using client-side transcript: "${transcript}"`);
    } else {
      // Fall back to server-side transcription
      const provider = process.env.STT_PROVIDER || 'vosk';
      this.logger.log(`Using STT provider: ${provider}`);
      
      try {
        transcript = await this.stt.transcribeWithProvider(provider, audioBuffer);
        this.logger.log(`Server-side transcript received: "${transcript}"`);
      } catch (error: any) {
        this.logger.error('STT transcription failed:', error);
        // Fallback to empty transcript - classifier will handle it
        transcript = '';
      }
    }
    
    const ai = this.classifier.classify(transcript);
    this.logger.log(`AI classification: ${ai.category} (${ai.severity})`);

    const sev = (ai.severity || 'Medium').toLowerCase();
    const severity: 'low' | 'medium' | 'high' | 'critical' =
      sev.includes('critical') ? 'critical' : sev.includes('high') ? 'high' : sev.includes('low') ? 'low' : 'medium';

    // At this point, latitude and longitude should be validated by the controller
    // But add a safety check here as well
    if (latitude === undefined || longitude === undefined || 
        isNaN(latitude) || isNaN(longitude) || 
        (latitude === 0 && longitude === 0)) {
      this.logger.warn(`Invalid coordinates received: lat=${latitude}, lng=${longitude}`);
      throw new Error('Invalid location coordinates');
    }

    // Make title unique by including first few words of transcript to avoid deduplication conflicts
    const transcriptPreview = transcript ? transcript.substring(0, 50).trim() : 'Voice alert';
    const title = transcriptPreview.length < 50 
      ? `Voice: ${transcriptPreview}` 
      : `Voice: ${transcriptPreview}...`;

    const dto: CreateAlertDto = {
      category: ai.category || 'Other',
      title,
      description: transcript || 'Voice alert',
      location: { lat: latitude, lng: longitude, address: '' },
      severity,
      ttlHours: 24,
    } as any;

    const saved = await this.alertsService.createAlert(userId, 'voice', dto);

    const contacts = await this.contactsService.findAll(userId);
    const notifiedContacts: any[] = [];
    for (const c of contacts as any[]) {
      if (!c.notify) continue;
      const msg = `LifeLine SOS from ${userId} - ${ai.category || 'Emergency'} (${ai.severity})\n${transcript}\nLocation: https://maps.google.com/?q=${latitude || ''},${longitude || ''}`;
      try {
        if (c.methods?.includes('sms')) {
          await this.notifier.sendSms(c.phone, msg);
          notifiedContacts.push({ contactId: c._id, method: 'sms', status: 'sent', sentAt: new Date() });
        }
        if (c.methods?.includes('whatsapp')) {
          await this.notifier.sendWhatsApp(c.phone, msg);
          notifiedContacts.push({ contactId: c._id, method: 'whatsapp', status: 'sent', sentAt: new Date() });
        }
        if (c.email) {
          await this.notifier.sendEmail(c.email, 'LifeLine SOS', `<p>${msg.replace(/\n/g, '<br/>')}</p>`);
          notifiedContacts.push({ contactId: c._id, method: 'email', status: 'sent', sentAt: new Date() });
        }
      } catch (err) {
        this.logger.error('Notify error', err as any);
        notifiedContacts.push({ contactId: c._id, method: 'unknown', status: 'error', error: String(err) });
      }
    }

    // Attach metadata (ignored by strict schema but returned to client)
    const baseObj: any = (saved && typeof (saved as any).toObject === 'function')
      ? (saved as any).toObject()
      : saved;
    const responseAlert: any = { ...baseObj };
    responseAlert.notifiedContacts = notifiedContacts;
    responseAlert.aiMetadata = { ...ai, transcript, receivedAt: new Date(), audioStored: false };

    return { saved: responseAlert, ai, transcript, notifiedContacts };
  }
}


