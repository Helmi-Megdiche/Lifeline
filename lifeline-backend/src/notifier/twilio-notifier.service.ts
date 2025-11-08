import { Injectable, Logger } from '@nestjs/common';

type MaybeTwilioClient = any;
type MaybeTransporter = any;

@Injectable()
export class TwilioNotifierService {
  private logger = new Logger(TwilioNotifierService.name);
  private twilio: MaybeTwilioClient | null = null;
  private transporter: MaybeTransporter | null = null;
  private fromPhone?: string;

  constructor() {
    // Initialize Twilio if creds exist
    const sid = process.env.TWILIO_ACCOUNT_SID;
    const token = process.env.TWILIO_AUTH_TOKEN;
    const from = process.env.TWILIO_PHONE_NUMBER;
    this.fromPhone = from;
    try {
      if (sid && token && from) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Twilio = require('twilio');
        this.twilio = Twilio(sid, token);
        this.logger.log('Twilio client initialized');
      }
    } catch (e) {
      this.logger.warn('Twilio package not installed; falling back to mock');
      this.twilio = null;
    }

    // Initialize Nodemailer if creds exist
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    if (emailUser && emailPass) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: emailUser, pass: emailPass },
        });
        this.logger.log('Nodemailer transporter initialized');
      } catch (e) {
        this.logger.warn('Nodemailer not available; falling back to mock');
        this.transporter = null;
      }
    }
  }

  private async retry<T>(fn: () => Promise<T>, label: string, attempts = 3, delayMs = 500): Promise<T> {
    let lastErr: any;
    for (let i = 0; i < attempts; i++) {
      try { return await fn(); } catch (e) {
        lastErr = e;
        this.logger.warn(`${label} attempt ${i + 1} failed: ${e?.message || e}`);
        if (i < attempts - 1) await new Promise(r => setTimeout(r, delayMs * (i + 1)));
      }
    }
    throw lastErr;
  }

  async sendSms(to: string, body: string) {
    if (this.twilio && this.fromPhone) {
      await this.retry(() => this.twilio.messages.create({ body, from: this.fromPhone, to }), 'twilio.sms');
      return { success: true, method: 'sms', to };
    }
    this.logger.log(`Mock SMS to ${to}: ${body}`);
    return { success: true, method: 'sms', to, mock: true } as any;
  }

  async sendWhatsApp(to: string, body: string) {
    if (this.twilio && this.fromPhone) {
      // Twilio WhatsApp requires from: 'whatsapp:+number', to: 'whatsapp:+number'
      const fromWa = this.fromPhone.startsWith('whatsapp:') ? this.fromPhone : `whatsapp:${this.fromPhone}`;
      const toWa = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
      await this.retry(() => this.twilio.messages.create({ body, from: fromWa, to: toWa }), 'twilio.whatsapp');
      return { success: true, method: 'whatsapp', to };
    }
    this.logger.log(`Mock WhatsApp to ${to}: ${body}`);
    return { success: true, method: 'whatsapp', to, mock: true } as any;
  }

  async sendEmail(to: string, subject: string, html: string) {
    if (this.transporter) {
      await this.retry(() => this.transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html }), 'email.send');
      return { success: true, method: 'email', to };
    }
    this.logger.log(`Mock Email to ${to}: ${subject}`);
    return { success: true, method: 'email', to, mock: true } as any;
  }
}


