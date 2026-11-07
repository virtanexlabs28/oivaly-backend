import {
  IsString,
  IsOptional,
  IsBoolean,
  MaxLength,
  IsEmail,
  IsUrl,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateStoreProfileDto {
  @ApiPropertyOptional({ example: 'My Awesome Store', description: 'Public display name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'My Awesome Studio Oy', description: 'Official legal business entity name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  legalBusinessName?: string;

  @ApiPropertyOptional({ example: '0112038-9', description: 'Finnish Business ID (Y-tunnus)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  businessId?: string;

  @ApiPropertyOptional({ example: 'FI01120389', description: 'Finnish VAT identification number' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatId?: string;

  @ApiPropertyOptional({ example: 'FI1234567890123456', description: 'Finnish / SEPA IBAN for artisan payouts' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankIban?: string;

  @ApiPropertyOptional({ example: 'NORDFIHH', description: 'Bank BIC / SWIFT code' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  bankBic?: string;

  @ApiPropertyOptional({ example: 'We sell the best products', description: 'Store description' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ example: '+1-555-000-0000' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiPropertyOptional({ example: '123 Market Street, City, Country' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 'Jane Doe', description: 'Primary contact name' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  contactName?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png', description: 'Store logo URL' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  logoUrl?: string;

  @ApiPropertyOptional({ example: 'https://mystore.com', description: 'Store website' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  websiteUrl?: string;
}

export class UpdateStoreSettingsDto {
  @ApiPropertyOptional({ example: true, description: 'Auto-submit products for approval on create' })
  @IsOptional()
  @IsBoolean()
  autoSubmitProducts?: boolean;

  @ApiPropertyOptional({ example: 5, description: 'Default low stock threshold for new products' })
  @IsOptional()
  defaultLowStockThreshold?: number;

  @ApiPropertyOptional({ example: 'GBP', description: 'Store default currency code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @ApiPropertyOptional({ example: 'Europe/London' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;
}
