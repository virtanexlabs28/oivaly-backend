import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, Matches } from 'class-validator';

export class CreatePermissionDto {
  @ApiProperty({
    example: 'products.create',
    description: 'Unique permission key in format resource.action',
  })
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z_]+\.[a-z_]+$/, {
    message: 'Key must be in format resource.action (lowercase, underscores allowed)',
  })
  key: string;

  @ApiProperty({ example: 'products', description: 'Resource name' })
  @IsString()
  @MaxLength(100)
  resource: string;

  @ApiProperty({ example: 'create', description: 'Action name' })
  @IsString()
  @MaxLength(100)
  action: string;

  @ApiPropertyOptional({ example: 'Allows creating products' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;
}
