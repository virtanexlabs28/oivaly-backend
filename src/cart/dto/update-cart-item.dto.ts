import { ApiProperty } from '@nestjs/swagger';
import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateCartItemDto {
  @ApiProperty({
    description: 'Updated quantity (must be at least 1)',
    example: 2,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
