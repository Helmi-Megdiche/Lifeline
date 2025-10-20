import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { User } from '../schemas/user.schema';
import { PasswordResetToken } from '../schemas/password-reset-token.schema';
import { RegisterUserDto, LoginUserDto } from '../dto';
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
}
