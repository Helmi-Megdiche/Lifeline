import { IsString, IsNotEmpty, IsNumber, IsOptional, IsIn, IsEmail } from 'class-validator';

export class CreateStatusDto {
  @IsIn(['safe', 'help'])
  @IsNotEmpty()
  status: 'safe' | 'help';

  @IsNumber()
  @IsNotEmpty()
  timestamp: number;

  @IsNumber()
  @IsOptional()
  latitude?: number;

  @IsNumber()
  @IsOptional()
  longitude?: number;

  @IsString()
  @IsOptional()
  userId?: string;
}

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

export class LoginUserDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  token: string;

  @IsString()
  @IsNotEmpty()
  newPassword: string;
}

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;
}

// Export alert DTOs
export * from './alert.dto';
export * from './map-snapshot.dto';
export * from './emergency-contact.dto';
