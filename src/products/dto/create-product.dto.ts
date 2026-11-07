import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsNumber,
  IsBoolean,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  MaxLength,
  IsPositive,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductImageDto {
  @ApiProperty({ example: 'https://cdn.example.com/product.jpg' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  url: string;

  @ApiPropertyOptional({ example: 'Blue sneakers front view' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  altText?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean;
}

export class CreateProductVariantDto {
  @ApiPropertyOptional({ example: 'XL' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  size?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  color?: string;

  @ApiPropertyOptional({ example: 'Pro Max' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @ApiPropertyOptional({ example: 'Storage' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attributeKey?: string;

  @ApiPropertyOptional({ example: '256GB' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  attributeValue?: string;

  @ApiPropertyOptional({ example: 'SKU-RED-XL-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiPropertyOptional({ example: 49.99, description: 'Variant-specific price override. Null = use product base price.' })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  price?: number;

  @ApiPropertyOptional({ example: 100, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockQuantity?: number;

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  lowStockThreshold?: number;
}

export class CreateProductDto {
  @ApiProperty({ example: 'Wireless Bluetooth Headphones' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'High-quality wireless headphones with noise cancellation.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Category UUID' })
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @ApiPropertyOptional({ example: 'SKU-WBH-001' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  sku?: string;

  @ApiProperty({ example: 99.99, description: 'Base price in store currency' })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiPropertyOptional({ example: 20.0, description: 'VAT / tax rate as percentage (e.g. 20 = 20%)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100)
  vatRate?: number;

  @ApiPropertyOptional({ example: false, description: 'Is VAT already included in the price?' })
  @IsOptional()
  @IsBoolean()
  vatIncluded?: boolean;

  @ApiPropertyOptional({ example: 'GB-VAT-20', description: 'Tax code / classification' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  vatCode?: string;

  @ApiPropertyOptional({ example: true, description: 'Whether to track inventory for this product' })
  @IsOptional()
  @IsBoolean()
  trackInventory?: boolean;

  @ApiPropertyOptional({ type: [CreateProductVariantDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiPropertyOptional({ type: [CreateProductImageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
