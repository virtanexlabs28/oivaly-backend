import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CategoryStatus } from '../enums/category-status.enum.js';

export class CreateCategoryDto {
  @ApiProperty({ example: 'Electronics', description: 'Unique category name' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiPropertyOptional({ example: 'Laptops, phones, gadgets', description: 'Category description' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/electronics.png', description: 'Category image URL' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  imageUrl?: string;

  @ApiPropertyOptional({ description: 'Parent category UUID (omit for top-level)' })
  @IsOptional()
  @IsUUID()
  parentId?: string;

  @ApiPropertyOptional({ example: 0, description: 'Display sort order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ enum: CategoryStatus, default: CategoryStatus.ACTIVE })
  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}
