import {
  Controller,
  Get,
  Post,
  Body,
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

import { IsEmail, IsNotEmpty } from 'class-validator';
import { ProductsService } from '../products.service.js';
import { MarketplaceQueryDto } from '../dto/product-query.dto.js';
import { Public } from '../../common/decorators/public.decorator.js';

export class NewsletterSubscribeDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

/**
 * Public Marketplace: Shows published products, active stores,
 * verified reviews, and discovery collections.
 * No authentication required.
 */
@ApiTags('4. Marketplace & Public — Products Catalog')
@Controller('marketplace')
export class MarketplaceController {
  constructor(private readonly productsService: ProductsService) {}

  @Get('stores')
  @Public()
  @ApiOperation({
    summary: 'List Active Marketplace Stores / Makers (Public)',
    description: 'Returns active verified stores with product count and featured product previews.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'search', required: false, example: 'Ceramics' })
  @ApiResponse({ status: 200, description: 'List of active marketplace stores' })
  getStores(
    @Query('limit') limit?: number,
    @Query('search') search?: string,
  ) {
    return this.productsService.getMarketplaceStores(
      limit ? Number(limit) : 20,
      search,
    );
  }

  @Get('stores/:id')
  @Public()
  @ApiOperation({
    summary: 'Get Public Store Profile (Public)',
    description: 'Returns public store details by UUID or name slug.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID or slug' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  getStore(@Param('id') id: string) {
    return this.productsService.getMarketplaceStore(id);
  }

  @Get('reviews')
  @Public()
  @ApiOperation({
    summary: 'Recent Verified Marketplace Reviews (Public)',
    description: 'Returns recent verified customer reviews across published marketplace products.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 6 })
  @ApiResponse({ status: 200, description: 'List of verified reviews' })
  getReviews(@Query('limit') limit?: number) {
    return this.productsService.getMarketplaceReviews(
      limit ? Number(limit) : 6,
    );
  }

  @Post('newsletter')
  @Public()
  @ApiOperation({
    summary: 'Subscribe to Marketplace Newsletter (Public)',
    description: 'Subscribes an email to marketplace dispatches.',
  })
  @ApiResponse({ status: 201, description: 'Subscribed successfully' })
  subscribeNewsletter(@Body() dto: NewsletterSubscribeDto) {
    return this.productsService.subscribeNewsletter(dto?.email);
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Global Marketplace Catalog (Public)',
    description:
      'Returns all published products from active stores. Supports search, category/store/price filtering, availability filtering, and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated marketplace products' })
  getMarketplace(@Query() query: MarketplaceQueryDto) {
    return this.productsService.getMarketplace(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Get Marketplace Product (Public)',
    description: 'Returns a single published product detail.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  getProduct(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }
}
