import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  MaxLength,
  IsEmail,
  IsArray,
  ArrayMinSize,
  IsInt,
  Min,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ShippingAddressDto } from './checkout.dto.js';

export class GuestCheckoutItemDto {
  @ApiPropertyOptional({ description: 'Product UUID' })
  @IsOptional()
  @IsUUID()
  productId?: string;

  @ApiPropertyOptional({ description: 'Product Variant UUID' })
  @IsOptional()
  @IsUUID()
  variantId?: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class GuestCheckoutDto {
  @ApiProperty({ example: 'guest.shopper@example.fi' })
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  guestEmail: string;

  @ApiProperty({ example: 'Liisa Virtanen' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  guestName: string;

  @ApiProperty({ example: '+358501234567' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  guestPhone: string;

  @ApiProperty({ description: 'Shipping address for order delivery' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({
    type: [GuestCheckoutItemDto],
    description: 'Items to purchase in guest session',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GuestCheckoutItemDto)
  items: GuestCheckoutItemDto[];

  @ApiPropertyOptional({
    description: 'Optional customer instructions or notes for the order',
    example: 'Please ring bell',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}
