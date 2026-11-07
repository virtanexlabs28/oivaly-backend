import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePlatformSettingDto {
  @ApiProperty({ description: 'New value for the setting', example: '12' })
  @IsNotEmpty()
  @IsString()
  value: string;
}

export class UpdatePlatformFeeDto {
  @ApiProperty({
    description: 'Platform commission fee percentage (1–50)',
    example: 10,
    minimum: 1,
    maximum: 50,
  })
  @IsNumber()
  @Min(1)
  @Max(50)
  feePercent: number;
}

export class UpdateHoldDaysDto {
  @ApiProperty({
    description: 'Number of days seller earnings are held before becoming available (1–90)',
    example: 14,
    minimum: 1,
    maximum: 90,
  })
  @IsNumber()
  @Min(1)
  @Max(90)
  holdDays: number;
}

export class UpdateMinimumPayoutDto {
  @ApiProperty({
    description: 'Minimum balance threshold in USD/EUR to trigger automated payout disbursement (5–10000)',
    example: 50,
    minimum: 5,
    maximum: 10000,
  })
  @IsNumber()
  @Min(5)
  @Max(10000)
  minimumAmount: number;
}
