import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RejectProductDto {
  @ApiProperty({ example: 'Product description is incomplete. Please provide detailed specifications.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  reason: string;
}

export class ApproveProductDto {
  @ApiPropertyOptional({ example: 'Approved for publication.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
