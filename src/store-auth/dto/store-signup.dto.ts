import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  MaxLength,
  IsBoolean,
  Equals,
  IsOptional,
} from 'class-validator';

export class StoreSignupDto {
  @ApiProperty({
    example: 'Nordic Artisan Bakery',
    description: 'Public display name of the store',
  })
  @IsString()
  @IsNotEmpty({ message: 'Store name is required' })
  @MinLength(2, { message: 'Store name must be at least 2 characters' })
  @MaxLength(100, { message: 'Store name cannot exceed 100 characters' })
  storeName: string;

  @ApiProperty({
    example: 'Nordic Bakery Oy',
    description: 'Official registered legal name of the business entity',
  })
  @IsString()
  @IsNotEmpty({ message: 'Legal business name is required' })
  @MinLength(2, { message: 'Legal business name must be at least 2 characters' })
  @MaxLength(255, { message: 'Legal business name cannot exceed 255 characters' })
  legalBusinessName: string;

  @ApiProperty({
    example: 'Aleksanterinkatu 15, 00100 Helsinki, Finland',
    description: 'Registered business street address',
  })
  @IsString()
  @IsNotEmpty({ message: 'Business address is required' })
  @MinLength(5, { message: 'Business address must be at least 5 characters' })
  @MaxLength(500, { message: 'Business address cannot exceed 500 characters' })
  businessAddress: string;

  @ApiProperty({
    example: 'Matti Meikäläinen',
    description: 'Full name of the primary contact person / store owner',
  })
  @IsString()
  @IsNotEmpty({ message: 'Contact name is required' })
  @MinLength(2, { message: 'Contact name must be at least 2 characters' })
  @MaxLength(100, { message: 'Contact name cannot exceed 100 characters' })
  contactName: string;

  @ApiProperty({
    example: 'matti@nordicbakery.fi',
    description: 'Store admin email address used for login and notifications',
  })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  email: string;

  @ApiProperty({
    example: '+358401234567',
    description: 'Business contact phone number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Phone number is required' })
  @MinLength(5, { message: 'Phone number must be at least 5 characters' })
  @MaxLength(50, { message: 'Phone number cannot exceed 50 characters' })
  phone: string;

  @ApiProperty({
    example: 'SecureVendor@2026',
    description: 'Password for store admin account (min 6 characters)',
  })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password: string;

  @ApiProperty({
    example: '1234567-8',
    description: 'Official Business ID / Y-tunnus / Registration number',
  })
  @IsString()
  @IsNotEmpty({ message: 'Business ID is required' })
  @MinLength(2, { message: 'Business ID must be at least 2 characters' })
  @MaxLength(100, { message: 'Business ID cannot exceed 100 characters' })
  businessId: string;

  @ApiPropertyOptional({
    example: 'FI12345678',
    description: 'VAT identifier (if applicable)',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100, { message: 'VAT ID cannot exceed 100 characters' })
  vatId?: string;

  @ApiProperty({
    example: true,
    description: 'Acceptance of the platform marketplace seller agreement (must be true)',
  })
  @IsBoolean({ message: 'sellerAgreementAccepted must be a boolean value' })
  @Equals(true, { message: 'You must accept the seller agreement to proceed with signup' })
  sellerAgreementAccepted: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Compatibility alias for sellerAgreementAccepted',
  })
  @IsOptional()
  @IsBoolean({ message: 'agreeToTerms must be a boolean value' })
  agreeToTerms?: boolean;
}

