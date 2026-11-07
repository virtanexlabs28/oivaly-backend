import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { ReviewsService } from '../reviews.service.js';
import { Public } from '../../common/decorators/public.decorator.js';

@ApiTags('4. Marketplace & Public — Product Reviews & Ratings')
@Controller('marketplace/products')
export class MarketplaceReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get(':productId/reviews')
  @ApiOperation({
    summary: 'Get Public Verified Reviews & Ratings Breakdown',
    description:
      'Returns published product reviews, average star rating (1-5), total count, and distribution.',
  })
  @ApiParam({ name: 'productId', description: 'Product UUID' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Product reviews summary and list' })
  async getReviews(
    @Param('productId', ParseUUIDPipe) productId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.reviewsService.getProductReviewsSummary(
      productId,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10,
    );
  }
}
