import { IsString, IsOptional, IsDateString } from 'class-validator';

export class EmergencyContactDto {
  @IsString()
  id: string;

  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  relationship?: string;

  @IsDateString()
  updatedAt: string; // ISO string for API responses
}

