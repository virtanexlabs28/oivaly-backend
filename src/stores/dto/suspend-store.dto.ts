import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class SuspendStoreDto {
  @ApiProperty({
    example: 'Policy violation: Unresolved customer dispute regarding counterfeit items.',
    description: 'Detailed reason explaining why the store is being suspended',
  })
  @IsString()
  @IsNotEmpty({ message: 'Suspension reason is required' })
  @MinLength(5, { message: 'Suspension reason must be at least 5 characters' })
  @MaxLength(1000, { message: 'Suspension reason cannot exceed 1000 characters' })
  reason: string;
}
