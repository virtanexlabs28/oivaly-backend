import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'UUID of the pending order to pay for',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsNotEmpty()
  @IsUUID()
  orderId: string;

  @ApiPropertyOptional({
    description: 'Optional frontend base return URL',
    example: 'http://localhost:3000',
  })
  @IsOptional()
  @IsString()
  returnUrl?: string;
}
