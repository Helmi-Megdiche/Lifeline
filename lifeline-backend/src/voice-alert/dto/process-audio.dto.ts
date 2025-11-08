import { IsOptional, IsNumber, IsString } from 'class-validator';

export class ProcessAudioDto {
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  userId?: string;
}


