import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SttService } from './stt/stt.service';
import { ClassifierService } from './intents/classifier.service';
import { ContactsService } from '../contacts/contacts.service';
import { EmailNotifierService } from '../notifier/email-notifier.service';
import { AlertsService } from '../alerts/alerts.service';
import { CreateAlertDto } from '../dto/alert.dto';
import { User } from '../schemas/user.schema';

@Injectable()
export class VoiceAlertService {
  private logger = new Logger(VoiceAlertService.name);

  constructor(
    private stt: SttService,
    private classifier: ClassifierService,
    private contactsService: ContactsService,
    private notifier: EmailNotifierService,
    private alertsService: AlertsService,
    @InjectModel(User.name) private userModel: Model<User>,
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
    const alertSeverity: 'low' | 'medium' | 'high' | 'critical' =
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
      severity: alertSeverity,
      ttlHours: 24,
    } as any;

    const saved = await this.alertsService.createAlert(userId, 'voice', dto);

    // Get user information for the notification message
    let userName = 'User';
    try {
      const user = await this.userModel.findById(userId).exec();
      if (user && user.username) {
        userName = user.username;
      }
    } catch (err) {
      this.logger.warn(`Could not fetch user info for ${userId}:`, err);
    }

    // Generate Google Maps link with exact coordinates
    const mapsLink = `https://www.google.com/maps?q=${latitude},${longitude}`;
    const mapsLinkShort = `https://maps.google.com/?q=${latitude},${longitude}`;

    // Create formatted notification message
    const category = ai.category || 'Emergency';
    const severityText = ai.severity || 'Medium';
    const transcriptText = transcript || 'Voice alert detected';
    
    // Comprehensive Email message with all details
    const emailSubject = `🚨 LifeLine Emergency Alert from ${userName} - ${category} (${severityText})`;
    
    // Determine severity color and urgency level
    const severityColors: Record<string, { bg: string; text: string; border: string }> = {
      'Critical': { bg: '#fee2e2', text: '#991b1b', border: '#dc2626' },
      'High': { bg: '#fef3c7', text: '#92400e', border: '#f59e0b' },
      'Medium': { bg: '#dbeafe', text: '#1e40af', border: '#3b82f6' },
      'Low': { bg: '#f3f4f6', text: '#374151', border: '#6b7280' }
    };
    
    const severityStyle = severityColors[severityText] || severityColors['Medium'];
    const currentTime = new Date().toLocaleString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    const emailBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>LifeLine Emergency Alert</title>
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
        <div style="max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); padding: 30px; text-align: center;">
            <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: bold;">🚨 LifeLine Emergency Alert</h1>
            <p style="margin: 10px 0 0 0; color: #fee2e2; font-size: 14px;">Immediate Action Required</p>
          </div>
          
          <!-- Alert Info Card -->
          <div style="padding: 25px; border-bottom: 2px solid #e5e7eb;">
            <div style="display: flex; align-items: center; margin-bottom: 15px;">
              <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); display: flex; align-items: center; justify-content: center; margin-right: 15px;">
                <span style="color: white; font-size: 24px; font-weight: bold;">${userName.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <h2 style="margin: 0; color: #111827; font-size: 22px; font-weight: bold;">${userName}</h2>
                <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">${currentTime}</p>
              </div>
            </div>
          </div>
          
          <!-- Category & Severity -->
          <div style="padding: 25px; background-color: ${severityStyle.bg}; border-left: 4px solid ${severityStyle.border};">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px;">
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Category</p>
                <p style="margin: 5px 0 0 0; color: ${severityStyle.text}; font-size: 18px; font-weight: bold;">${category}</p>
              </div>
              <div>
                <p style="margin: 0; color: #6b7280; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Urgency Level</p>
                <p style="margin: 5px 0 0 0; color: ${severityStyle.text}; font-size: 18px; font-weight: bold;">${severityText}</p>
              </div>
            </div>
          </div>
          
          <!-- Voice Transcript -->
          <div style="padding: 25px; background-color: #f9fafb; border-bottom: 1px solid #e5e7eb;">
            <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 8px;">🎤</span> What ${userName} Said:
            </h3>
            <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; border-left: 4px solid #6366f1;">
              <p style="margin: 0; color: #374151; font-size: 16px; line-height: 1.6; font-style: italic;">
                "${transcriptText || 'Voice alert detected (transcript unavailable)'}"
              </p>
            </div>
          </div>
          
          <!-- Location Section -->
          <div style="padding: 25px; background-color: #ffffff;">
            <h3 style="margin: 0 0 15px 0; color: #111827; font-size: 16px; font-weight: 600; display: flex; align-items: center;">
              <span style="margin-right: 8px;">📍</span> Exact Location:
            </h3>
            <div style="background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%); padding: 20px; border-radius: 8px; border: 2px solid #3b82f6;">
              <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px; font-weight: 600;">Coordinates:</p>
              <p style="margin: 0 0 15px 0; color: #1e3a8a; font-size: 18px; font-weight: bold; font-family: 'Courier New', monospace;">
                ${latitude}, ${longitude}
              </p>
              <a href="${mapsLink}" 
                 style="display: inline-block; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; box-shadow: 0 4px 6px rgba(37, 99, 235, 0.3); transition: transform 0.2s;">
                🗺️ Open in Google Maps
              </a>
            </div>
          </div>
          
          <!-- Action Required -->
          <div style="padding: 25px; background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%); border-top: 2px solid #dc2626;">
            <div style="display: flex; align-items: start;">
              <span style="font-size: 32px; margin-right: 15px;">⚠️</span>
              <div>
                <h3 style="margin: 0 0 10px 0; color: #991b1b; font-size: 18px; font-weight: bold;">Immediate Action Required</h3>
                <p style="margin: 0; color: #7f1d1d; font-size: 14px; line-height: 1.6;">
                  Please respond immediately and check on <strong>${userName}</strong>. This is an automated emergency alert from the LifeLine system. 
                  ${severityText === 'Critical' || severityText === 'High' ? 'This is a HIGH PRIORITY emergency requiring immediate attention.' : 'Please verify their safety and provide assistance if needed.'}
                </p>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="padding: 20px; background-color: #f9fafb; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #6b7280; font-size: 12px;">
              This is an automated message from <strong>LifeLine Emergency System</strong>
            </p>
            <p style="margin: 5px 0 0 0; color: #9ca3af; font-size: 11px;">
              Alert ID: ${saved?._id || 'N/A'} | Generated: ${new Date().toISOString()}
            </p>
          </div>
          
        </div>
      </body>
      </html>
    `;

    // Send notifications to all contacts
    const contacts = await this.contactsService.findAll(userId);
    const notifiedContacts: any[] = [];
    
    this.logger.log(`📋 Found ${contacts.length} contacts for user ${userName}`);
    this.logger.log(`📋 Contacts details:`, JSON.stringify(contacts, null, 2));
    
    if (contacts.length === 0) {
      this.logger.warn(`⚠️ No contacts found for user ${userName} - notifications will not be sent`);
    }
    
    for (const c of contacts as any[]) {
      // Check if contact has notify enabled (defaults to true if not set)
      if (c.notify === false) {
        this.logger.log(`⏭️ Skipping contact ${c.name} (notify disabled)`);
        continue;
      }

      // Email-only notifications (Twilio/SMS/WhatsApp removed)
      if (c.email) {
        try {
          this.logger.log(`📧 Attempting to send Email to ${c.name} at ${c.email}`);
          const emailResult = await this.notifier.sendEmail(c.email, emailSubject, emailBody);
          notifiedContacts.push({ 
            contactId: c._id, 
            contactName: c.name,
            method: 'email', 
            status: 'sent', 
            sentAt: new Date(),
            result: emailResult
          });
          this.logger.log(`✅ Email sent successfully to ${c.name} (${c.email})`);
        } catch (emailErr: any) {
          this.logger.error(`❌ Email failed for ${c.name}:`, emailErr.message || emailErr);
          notifiedContacts.push({ 
            contactId: c._id, 
            contactName: c.name,
            method: 'email', 
            status: 'error', 
            error: emailErr.message || String(emailErr),
            sentAt: new Date()
          });
        }
      } else {
        this.logger.warn(`⚠️ Contact ${c.name} has no email address - cannot send notification`);
      }
    }

    const successful = notifiedContacts.filter(n => n.status === 'sent').length;
    const failed = notifiedContacts.filter(n => n.status === 'error').length;
    this.logger.log(`📧 Notification Summary: ${successful} successful, ${failed} failed`);
    this.logger.log(`📧 Notification details:`, JSON.stringify(notifiedContacts, null, 2));
    
    if (successful === 0 && contacts.length > 0) {
      this.logger.warn(`⚠️ WARNING: No notifications were successfully sent despite having ${contacts.length} contact(s)!`);
      this.logger.warn(`⚠️ This might indicate:`);
      this.logger.warn(`   - Email service not configured (check EMAIL_USER and EMAIL_PASS environment variables)`);
      this.logger.warn(`   - Contact methods not properly set`);
      this.logger.warn(`   - Phone numbers or emails invalid`);
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


