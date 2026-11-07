import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReturnRequestStatus } from '../enums/return-request-status.enum.js';

export class UpdateReturnStatusDto {
  @ApiProperty({
    enum: ReturnRequestStatus,
    example: ReturnRequestStatus.APPROVED,
    description: 'Target review status',
  })
  @IsEnum(ReturnRequestStatus)
  @IsNotEmpty()
  status: ReturnRequestStatus;

  @ApiPropertyOptional({ example: 'Return label dispatched to customer' })
  @IsOptional()
  @IsString()
  adminNotes?: string;

  @ApiPropertyOptional({ example: 'Item opened / hygiene seal broken' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
