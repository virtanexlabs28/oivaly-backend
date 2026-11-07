import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ShippingAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: '+1234567890' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  phone: string;

  @ApiProperty({ example: '123 Market Street' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Suite 400' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  addressLine2?: string;

  @ApiProperty({ example: 'Helsinki' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city: string;

  @ApiPropertyOptional({ example: 'Uusimaa' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiProperty({ example: '00100' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  postalCode: string;

  @ApiProperty({ example: 'Finland' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country: string;
}

export class CheckoutDto {
  @ApiProperty({ description: 'Shipping address for order delivery' })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiPropertyOptional({
    description: 'Optional customer instructions or notes for the order',
    example: 'Please leave at front door',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}
