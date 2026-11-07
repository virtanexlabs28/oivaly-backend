import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { StoreStatus } from '../enums/store-status.enum.js';

export class StoreQueryDto {
  @ApiPropertyOptional({ example: 1, default: 1, description: 'Page number' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 20, default: 20, description: 'Items per page' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    enum: StoreStatus,
    description: 'Filter stores by operational status',
  })
  @IsOptional()
  @IsEnum(StoreStatus, { message: 'Invalid store status filter' })
  status?: StoreStatus;

  @ApiPropertyOptional({
    example: 'bakery',
    description: 'Search by store name, legal business name, or business ID',
  })
  @IsOptional()
  @IsString()
  search?: string;
}
