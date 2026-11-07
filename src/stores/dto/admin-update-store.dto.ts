import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StoreStatus } from '../enums/store-status.enum.js';

export class AdminUpdateStoreDto {
  @ApiPropertyOptional({ example: 'Lapland Woodcraft Studio', description: 'Store public name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'Lapland Woodcraft Oy', description: 'Official legal entity name' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  legalBusinessName?: string;

  @ApiPropertyOptional({ example: '1234567-8', description: 'Business ID / Y-tunnus' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  businessId?: string;

  @ApiPropertyOptional({ example: 'FI12345678', description: 'VAT / ALV number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatId?: string;

  @ApiPropertyOptional({ example: 'Valtakatu 12, 96100 Rovaniemi, Finland', description: 'Physical address' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: '+358 40 987 6543', description: 'Phone number' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: 'Tapio Korhonen', description: 'Contact person' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ enum: StoreStatus, description: 'Store lifecycle status' })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: StoreStatus;

  @ApiPropertyOptional({ example: 'EUR', description: 'Currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 'Europe/Helsinki', description: 'Timezone' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  @ApiPropertyOptional({ example: 'Handmade Nordic woodwork from Finnish birch.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://laplandwoodcraft.fi' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  autoSubmitProducts?: boolean;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  defaultLowStockThreshold?: number;

  @ApiPropertyOptional({ example: 'Documentation verified' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  rejectionReason?: string;

  @ApiPropertyOptional({ example: 'Under investigation' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  suspensionReason?: string;
}

export class UpdateStoreStatusDto {
  @ApiProperty({ enum: StoreStatus, description: 'Store lifecycle status' })
  @IsEnum(StoreStatus)
  status: StoreStatus;

  @ApiPropertyOptional({ example: 'Manual approval by super admin' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
