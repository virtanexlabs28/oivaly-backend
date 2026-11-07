import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsInt, Min, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class AddCartItemDto {
  @ApiProperty({
    description: 'Product UUID to add to cart',
    example: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  })
  @IsUUID('4')
  productId: string;

  @ApiPropertyOptional({
    description: 'Optional Product Variant UUID (required if product has variants)',
    example: 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
  })
  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @ApiProperty({
    description: 'Quantity to add (must be at least 1)',
    example: 1,
    default: 1,
  })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
