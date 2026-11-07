import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ReturnRequestStatus } from '../enums/return-request-status.enum.js';
import { ReturnRequestType } from '../enums/return-request-type.enum.js';

export class ReturnQueryDto {
  @ApiPropertyOptional({ enum: ReturnRequestType })
  @IsOptional()
  @IsEnum(ReturnRequestType)
  type?: ReturnRequestType;

  @ApiPropertyOptional({ enum: ReturnRequestStatus })
  @IsOptional()
  @IsEnum(ReturnRequestStatus)
  status?: ReturnRequestStatus;

  @ApiPropertyOptional({ description: 'Filter by Store UUID' })
  @IsOptional()
  @IsString()
  storeId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20;
}
