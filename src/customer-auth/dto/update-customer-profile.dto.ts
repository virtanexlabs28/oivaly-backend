import { IsOptional, IsString, MinLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerProfileDto {
  @ApiPropertyOptional({ example: 'Matti Virtanen' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @ApiPropertyOptional({ example: '+358401234567' })
  @IsOptional()
  @IsString()
  phone?: string;
}
