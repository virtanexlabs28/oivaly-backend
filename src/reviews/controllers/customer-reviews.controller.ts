import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { ReviewsService } from '../reviews.service.js';
import { CreateReviewDto } from '../dto/create-review.dto.js';
import { UpdateReviewDto } from '../dto/update-review.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('3. Customer — Product Reviews')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard)
@Controller('customer/reviews')
export class CustomerReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit Verified Purchase Product Review',
    description:
      'Gated: Customer must have a confirmed order containing this product. One review per customer per product.',
  })
  @ApiResponse({ status: 201, description: 'Review submitted successfully' })
  @ApiResponse({ status: 403, description: 'Customer is not a verified purchaser of this product' })
  @ApiResponse({ status: 409, description: 'Review already submitted for this product' })
  async create(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(user.sub, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'List reviews submitted by current customer' })
  @ApiResponse({ status: 200, description: 'List of own reviews' })
  async findMy(@CurrentUser() user: JwtPayload) {
    return this.reviewsService.findMyReviews(user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update own product review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  async update(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(id, user.sub, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete own product review' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  async remove(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    await this.reviewsService.remove(id, user.sub);
  }
}
