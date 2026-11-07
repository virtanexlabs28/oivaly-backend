import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  IsArray,
  ArrayMinSize,
  ValidateNested,
  IsInt,
  Min,
  IsEmail,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ReturnRequestType } from '../enums/return-request-type.enum.js';

export class ReturnItemDto {
  @ApiProperty({ description: 'OrderItem UUID' })
  @IsUUID()
  @IsNotEmpty()
  orderItemId: string;

  @ApiProperty({ example: 1, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Defective zipper / wrong size' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CreateReturnRequestDto {
  @ApiProperty({ description: 'Order UUID' })
  @IsUUID()
  @IsNotEmpty()
  orderId: string;

  @ApiPropertyOptional({ description: 'Optional StoreOrder UUID' })
  @IsOptional()
  @IsUUID()
  storeOrderId?: string;

  @ApiProperty({
    enum: ReturnRequestType,
    example: ReturnRequestType.WITHDRAWAL,
    description: 'Statutory 14-day WITHDRAWAL, COMPLAINT, or ADMINISTRATIVE_REFUND',
  })
  @IsEnum(ReturnRequestType)
  type: ReturnRequestType;

  @ApiProperty({ example: 'Product does not fit', description: 'Primary reason for request' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({
    example: 'Item is unused with original tags in original box.',
    description: 'Detailed description of condition or defect',
  })
  @IsOptional()
  @IsString()
  details?: string;

  @ApiProperty({ type: [ReturnItemDto], description: 'Items to return' })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReturnItemDto)
  items: ReturnItemDto[];

  @ApiPropertyOptional({
    example: 'guest@example.fi',
    description: 'Customer email (required if submitting for guest order)',
  })
  @IsOptional()
  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.trim().toLowerCase())
  guestEmail?: string;
}
