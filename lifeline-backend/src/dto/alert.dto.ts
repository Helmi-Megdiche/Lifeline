import { IsString, IsNotEmpty, IsEnum, IsNumber, IsOptional, IsObject, ValidateNested, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class LocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;

  @IsOptional()
  @IsString()
  address?: string;
}

export class CreateAlertDto {
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(24 * 7) // Max 7 days
  ttlHours?: number;
}

export class ReportAlertDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
  
  @IsOptional()
  @IsString()
  comment?: string;
}

export class AlertListDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  minLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  maxLat?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  minLng?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  maxLng?: number;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high', 'critical'])
  severity?: 'low' | 'medium' | 'high' | 'critical';

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;
}
