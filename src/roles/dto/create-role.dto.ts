import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateRoleDto {
  @ApiProperty({ example: 'PRODUCT_MANAGER', description: 'Unique role name (uppercase recommended)' })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Can manage products and categories' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
