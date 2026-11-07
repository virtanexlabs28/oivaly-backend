import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StoreOrderStatus } from '../enums/store-order-status.enum.js';

export class UpdateStoreOrderStatusDto {
  @ApiProperty({
    enum: StoreOrderStatus,
    description: 'Updated fulfillment status for store order',
    example: StoreOrderStatus.PROCESSING,
  })
  @IsEnum(StoreOrderStatus)
  status: StoreOrderStatus;

  @ApiPropertyOptional({
    description: 'Optional fulfillment tracking or internal notes',
    example: 'Packed and waiting for courier pickup',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Shipping tracking number or consignment code',
    example: 'JJFI00123456789012345',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  trackingNumber?: string;

  @ApiPropertyOptional({
    description: 'Courier carrier name (defaults to Posti)',
    example: 'Posti',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  carrier?: string;

  @ApiPropertyOptional({
    description: 'Web link to track the parcel directly',
    example: 'https://www.posti.fi/en/tracking#/seuranta/JJFI00123456789012345',
  })
  @IsOptional()
  @IsString()
  trackingUrl?: string;
}

