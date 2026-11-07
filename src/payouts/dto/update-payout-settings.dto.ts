import { IsEnum, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PayoutMethod } from '../enums/payout-method.enum.js';

export class UpdatePayoutSettingsDto {
  @ApiPropertyOptional({ enum: PayoutMethod, default: PayoutMethod.BANK_TRANSFER })
  @IsOptional()
  @IsEnum(PayoutMethod)
  payoutMethod?: PayoutMethod;

  @ApiPropertyOptional({ example: 'John Doe Ltd.' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  bankAccountName?: string;

  @ApiPropertyOptional({ example: 'FI1234567890123456' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankAccountNumber?: string;

  @ApiPropertyOptional({ example: '012345678' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankRoutingNumber?: string;

  @ApiPropertyOptional({ example: 'FI2112345600000785' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankIban?: string;

  @ApiPropertyOptional({ example: 'DABAFIHH' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bankSwift?: string;

  @ApiPropertyOptional({ example: 'acct_1Nxxxxxxxxxxxx' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  stripeAccountId?: string;

  @ApiPropertyOptional({ example: 50.0, description: 'Minimum balance required to trigger automated payout' })
  @IsOptional()
  @IsNumber()
  @Min(10)
  minimumPayoutThreshold?: number;
}
