import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    // Using Gmail SMTP for testing - you can change this to any SMTP provider
    const emailUser = process.env.EMAIL_USER || 'helmimegdiche07@gmail.com';
    const emailPass = (process.env.EMAIL_PASS || 'myeqjnwtxlajrvdn').replace(/\s/g, ''); // Remove spaces from app password
    
    
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPass, // Use App Password for Gmail
      },
    });
  }

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
      from: process.env.EMAIL_USER || 'helmimegdiche07@gmail.com',
      to: email,
      subject: 'Password Reset Request - Lifeline App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">Password Reset Request</h2>
          <p>Hello,</p>
          <p>You have requested to reset your password for your Lifeline App account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
          <p><strong>This link will expire in 1 hour.</strong></p>
          <p>If you didn't request this password reset, please ignore this email.</p>
          <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px;">
            This email was sent from Lifeline App. Please do not reply to this email.
          </p>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendOTPEmail(email: string, otp: string): Promise<void> {
    const mailOptions = {
      from: process.env.EMAIL_USER || 'helmimegdiche07@gmail.com',
      to: email,
      subject: 'Password Reset OTP - Lifeline App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h2 style="color: white; margin: 0;">Password Reset Request</h2>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">Hello,</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 20px;">You have requested to reset your password for your Lifeline App account.</p>
            <p style="color: #374151; font-size: 16px; margin-bottom: 30px;">Please use the following OTP code to verify your identity:</p>
            <div style="text-align: center; margin: 40px 0;">
              <div style="background: white; border: 3px solid #2563eb; border-radius: 12px; padding: 25px; display: inline-block; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 600; letter-spacing: 1px;">YOUR OTP CODE</p>
                <p style="color: #2563eb; font-size: 36px; font-weight: bold; letter-spacing: 8px; margin: 0; font-family: 'Courier New', monospace;">${otp}</p>
              </div>
            </div>
            <p style="color: #dc2626; font-size: 14px; margin-top: 30px; font-weight: 600;">
              ⚠️ This OTP will expire in 15 minutes.
            </p>
            <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
              If you didn't request this password reset, please ignore this email. Your account remains secure.
            </p>
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
              This email was sent from Lifeline App. Please do not reply to this email.
            </p>
          </div>
        </div>
      `,
    };

    try {
      await this.transporter.sendMail(mailOptions);
    } catch (error) {
      console.error('Failed to send OTP email:', error);
      throw new Error('Failed to send OTP email');
    }
  }
}
