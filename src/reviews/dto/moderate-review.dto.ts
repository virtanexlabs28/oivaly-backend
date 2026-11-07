import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ReviewStatus } from '../enums/review-status.enum.js';

export class ModerateReviewDto {
  @ApiProperty({ enum: ReviewStatus, example: ReviewStatus.PUBLISHED })
  @IsEnum(ReviewStatus)
  @IsNotEmpty()
  status: ReviewStatus;

  @ApiPropertyOptional({ example: 'Violates content policy / abusive language' })
  @IsOptional()
  @IsString()
  adminNotes?: string;
}
