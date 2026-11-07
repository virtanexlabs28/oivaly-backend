import {
  IsNumber,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateVariantInventoryDto {
  @ApiProperty({ example: 50, description: 'Absolute stock quantity to set' })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  stockQuantity: number;

  @ApiPropertyOptional({ example: 10, description: 'Low stock threshold for alerts' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  lowStockThreshold?: number;
}

export class AdjustVariantInventoryDto {
  @ApiProperty({ example: -5, description: 'Delta to apply to current stock (positive = add, negative = remove)' })
  @Type(() => Number)
  @IsNumber()
  delta: number;

  @ApiPropertyOptional({ example: 'Manual adjustment - damaged goods', description: 'Reason for adjustment' })
  @IsOptional()
  adjustment?: string;
}
