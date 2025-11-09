import { Injectable, Logger } from '@nestjs/common';

type MaybeTransporter = any;

@Injectable()
export class EmailNotifierService {
  private logger = new Logger(EmailNotifierService.name);
  private transporter: MaybeTransporter | null = null;

  constructor() {
    // Initialize Nodemailer if creds exist
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASS;
    
    // Debug logging to verify env vars are loaded
    this.logger.log(`🔍 Email config check: User=${emailUser ? 'SET' : 'MISSING'}, Pass=${emailPass ? 'SET' : 'MISSING'}`);
    
    if (emailUser && emailPass) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const nodemailer = require('nodemailer');
        this.transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: emailUser, pass: emailPass },
        });
        this.logger.log('✅ Nodemailer transporter initialized successfully');
      } catch (e) {
        this.logger.warn('Nodemailer not available; falling back to mock');
        this.transporter = null;
      }
    } else {
      this.logger.warn('⚠️ Email credentials incomplete - missing EMAIL_USER or EMAIL_PASS');
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

  async sendEmail(to: string, subject: string, html: string) {
    if (this.transporter) {
      this.logger.log(`📧 Sending REAL Email via Nodemailer to ${to}`);
      await this.retry(() => this.transporter.sendMail({ from: process.env.EMAIL_USER, to, subject, html }), 'email.send');
      this.logger.log(`✅ Email sent successfully via Nodemailer to ${to}`);
      return { success: true, method: 'email', to, real: true };
    }
    this.logger.warn(`⚠️ MOCK Email to ${to} (Email not configured - check EMAIL_USER, EMAIL_PASS)`);
    this.logger.warn(`⚠️ Mock Email subject: ${subject}`);
    return { success: true, method: 'email', to, mock: true } as any;
  }
}


