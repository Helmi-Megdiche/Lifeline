import { IsNumber, IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class MapSnapshotDto {
  @IsNumber()
  lat!: number;

  @IsNumber()
  lng!: number;

  @IsOptional()
  @IsString()
  @MaxLength(700000) // ~500KB base64 (conservative limit)
  mapImage?: string;

  @IsOptional()
  @IsString()
  timestamp?: string;

  @IsOptional()
  @IsBoolean()
  locationUnavailable?: boolean;
}

