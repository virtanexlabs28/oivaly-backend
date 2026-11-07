import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { OrderStatus } from '../enums/order-status.enum.js';

export class UpdateOrderStatusDto {
  @ApiProperty({
    enum: OrderStatus,
    description: 'Target status for parent order',
    example: OrderStatus.PROCESSING,
  })
  @IsEnum(OrderStatus)
  status: OrderStatus;

  @ApiPropertyOptional({
    description: 'Optional admin notes or reason for status update',
    example: 'Payment verified manually by finance team',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
