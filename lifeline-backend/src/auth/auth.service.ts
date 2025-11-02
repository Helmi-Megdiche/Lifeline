import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../schemas/user.schema';
import { PasswordResetToken } from '../schemas/password-reset-token.schema';
import { RegisterUserDto, LoginUserDto, UpdateProfileDto } from '../dto';
import { EmailService } from './email.service';
import * as crypto from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(PasswordResetToken.name) private passwordResetTokenModel: Model<PasswordResetToken>,
    private jwtService: JwtService,
    private emailService: EmailService,
  ) {}

  async register(registerUserDto: RegisterUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(registerUserDto.password, 10);
    const newUser = new this.userModel({
      username: registerUserDto.username,
      password: hashedPassword,
      email: registerUserDto.email,
    });
    return newUser.save();
  }

  async login(loginUserDto: LoginUserDto): Promise<{ accessToken: string; user: { id: string; username: string; email?: string } }> {
    const user = await this.userModel.findOne({ username: loginUserDto.username });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(loginUserDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { username: user.username, sub: user._id };
    return {
      accessToken: this.jwtService.sign(payload),
      user: { id: (user._id as any).toString(), username: user.username, email: user.email },
    };
  }

  async requestPasswordReset(email: string): Promise<void> {
    // Find user by email
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      // Do not reveal if email exists - return silently
      return;
    }

    // Generate a secure random token
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (1 hour from now)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1);

    // Save the reset token to database
    await this.passwordResetTokenModel.create({
      userId: (user._id as any).toString(),
      token: resetToken,
      expiresAt,
      used: false,
    });

    // Send email with reset link
    await this.emailService.sendPasswordResetEmail(email, resetToken);
  }

  // New OTP-based password reset methods
  async requestPasswordResetOTP(email: string): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      // For security, don't reveal if email exists
      return { success: true, message: 'If an account exists with this email, an OTP has been sent.' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Generate a secure random token for password reset
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Set expiration time (15 minutes from now for OTP)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    // Delete any existing unused tokens for this user
    await this.passwordResetTokenModel.deleteMany({
      userId: (user._id as any).toString(),
      used: false,
      otpVerified: false,
    }).exec();

    // Save the reset token with OTP to database
    await this.passwordResetTokenModel.create({
      userId: (user._id as any).toString(),
      token: resetToken,
      otp: otp,
      expiresAt,
      used: false,
      otpVerified: false,
    });

    // Send email with OTP
    await this.emailService.sendOTPEmail(email, otp);

    return { success: true, message: 'OTP sent to your email address.' };
  }

  async verifyOTP(email: string, otp: string): Promise<{ success: boolean; token: string; message: string }> {
    // Find user by email
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new UnauthorizedException('Invalid email or OTP');
    }

    // Find the reset token with matching OTP
    const resetTokenDoc = await this.passwordResetTokenModel.findOne({
      userId: (user._id as any).toString(),
      otp: otp,
      used: false,
      expiresAt: { $gt: new Date() }, // Not expired
    }).exec();

    if (!resetTokenDoc) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Mark OTP as verified
    await this.passwordResetTokenModel.findByIdAndUpdate(resetTokenDoc._id, {
      otpVerified: true,
    }).exec();

    return { 
      success: true, 
      token: resetTokenDoc.token,
      message: 'OTP verified successfully' 
    };
  }

  async resetPasswordWithOTP(email: string, otp: string, newPassword: string): Promise<{ success: boolean; message: string }> {
    // Find user by email
    const user = await this.userModel.findOne({ email }).exec();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Find the reset token with verified OTP
    const resetTokenDoc = await this.passwordResetTokenModel.findOne({
      userId: (user._id as any).toString(),
      otp: otp,
      otpVerified: true,
      used: false,
      expiresAt: { $gt: new Date() },
    }).exec();

    if (!resetTokenDoc) {
      throw new UnauthorizedException('Invalid or expired OTP. Please request a new OTP.');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
    }).exec();

    // Mark the token as used
    await this.passwordResetTokenModel.findByIdAndUpdate(resetTokenDoc._id, {
      used: true,
    }).exec();

    return { success: true, message: 'Password reset successfully' };
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Find the reset token
    const resetTokenDoc = await this.passwordResetTokenModel.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() }, // Token not expired
    }).exec();

    if (!resetTokenDoc) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Find the user
    const user = await this.userModel.findById(resetTokenDoc.userId).exec();
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user's password
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
    }).exec();

    // Mark the token as used
    await this.passwordResetTokenModel.findByIdAndUpdate(resetTokenDoc._id, {
      used: true,
    }).exec();
  }

  async validateUser(username: string): Promise<User | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async searchUsers(query: string): Promise<{ id: string; username: string; email?: string }[]> {
    if (!query || query.trim().length < 2) {
      return [];
    }

    const searchTerm = query.trim();
    const users = await this.userModel.find({
      $or: [
        { username: { $regex: searchTerm, $options: 'i' } },
        { email: { $regex: searchTerm, $options: 'i' } }
      ]
    }).limit(10).select('username email');

    return users.map(user => ({
      id: (user._id as any).toString(),
      username: user.username,
      email: user.email,
    }));
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto): Promise<{ id: string; username: string; email: string }> {
    // Check if username is already taken by another user
    const existingUser = await this.userModel.findOne({ 
      username: updateProfileDto.username,
      _id: { $ne: userId }
    }).exec();
    
    if (existingUser) {
      throw new UnauthorizedException('Username already taken');
    }

    // Check if email is already taken by another user
    const existingEmail = await this.userModel.findOne({ 
      email: updateProfileDto.email,
      _id: { $ne: userId }
    }).exec();
    
    if (existingEmail) {
      throw new UnauthorizedException('Email already taken');
    }

    // Update user profile
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      {
        username: updateProfileDto.username,
        email: updateProfileDto.email,
      },
      { new: true }
    ).exec();

    if (!updatedUser) {
      throw new UnauthorizedException('User not found');
    }

    return {
      id: (updatedUser._id as any).toString(),
      username: updatedUser.username,
      email: updatedUser.email || '',
    };
  }
}
