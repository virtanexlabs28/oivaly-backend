import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ description: 'Product UUID' })
  @IsUUID()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5, description: 'Star rating from 1 to 5' })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiPropertyOptional({ example: 'Erittäin hyvä tuote!', description: 'Review headline' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @ApiProperty({
    example: 'Fast shipping, high quality material, matches description perfectly.',
    description: 'Detailed written review',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  comment: string;
}
