import { Controller, Post, Body, HttpCode, HttpStatus, Get, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto, LoginUserDto, ForgotPasswordDto, ResetPasswordDto, UpdateProfileDto } from '../dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('test')
  async test() {
    return { message: 'Auth controller is working' };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() registerUserDto: RegisterUserDto) {
    const user = await this.authService.register(registerUserDto);
    return { success: true, message: 'User registered successfully', user: { id: user._id, username: user.username, email: user.email } };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginUserDto: LoginUserDto) {
    return this.authService.login(loginUserDto);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    await this.authService.requestPasswordReset(body.email);
    return { success: true };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() body: ResetPasswordDto) {
    await this.authService.resetPassword(body.token, body.newPassword);
    return { success: true, message: 'Password reset successfully' };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    const updatedUser = await this.authService.updateProfile(req.user.userId, updateProfileDto);
    return { success: true, message: 'Profile updated successfully', user: updatedUser };
  }
}
