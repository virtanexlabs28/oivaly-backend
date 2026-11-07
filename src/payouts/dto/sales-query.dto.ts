import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum SalesPeriod {
  TODAY = 'today',
  LAST_7_DAYS = '7d',
  LAST_30_DAYS = '30d',
  THIS_MONTH = 'this_month',
  ALL = 'all',
}

export class SalesQueryDto {
  @ApiPropertyOptional({ enum: SalesPeriod, default: SalesPeriod.LAST_30_DAYS })
  @IsOptional()
  @IsEnum(SalesPeriod)
  period?: SalesPeriod = SalesPeriod.LAST_30_DAYS;

  @ApiPropertyOptional({ example: '2026-10-01' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ example: '2026-10-31' })
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
