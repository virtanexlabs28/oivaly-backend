import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Matti Meikäläinen' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiProperty({ example: '+358401234567' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Mannerheimintie 10 B' })
  @IsString()
  @IsNotEmpty()
  streetAddress: string;

  @ApiPropertyOptional({ example: 'Apt 4B' })
  @IsOptional()
  @IsString()
  apartment?: string;

  @ApiProperty({ example: 'Helsinki' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: '00100' })
  @IsString()
  @IsNotEmpty()
  postalCode: string;

  @ApiPropertyOptional({ example: 'FI', default: 'FI' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true, default: false })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
