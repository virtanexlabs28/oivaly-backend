import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class RejectStoreDto {
  @ApiProperty({
    example: 'Incomplete business registration documentation provided.',
    description: 'Reason explaining why the store application was rejected',
  })
  @IsString()
  @IsNotEmpty({ message: 'Rejection reason is required' })
  @MinLength(5, { message: 'Rejection reason must be at least 5 characters' })
  @MaxLength(1000, { message: 'Rejection reason cannot exceed 1000 characters' })
  reason: string;
}
