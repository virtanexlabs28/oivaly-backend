import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { ProductsService } from '../products.service.js';
import { ProductQueryDto } from '../dto/product-query.dto.js';
import { RejectProductDto } from '../dto/product-approval.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

/**
 * Platform Admin: Full cross-store visibility and approval workflow.
 */
@ApiTags('1. Platform Admin — Product Moderation')
@ApiBearerAuth('access-token')
@Controller('admin/products')
export class AdminProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @RequirePermissions('products.read')
  @ApiOperation({
    summary: 'List All Products (Admin)',
    description: 'Platform Admin view of all products across all stores with filtering.',
  })
  @ApiResponse({ status: 200, description: 'Paginated product list' })
  findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAllAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('products.read')
  @ApiOperation({ summary: 'Get Any Product (Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.productsService.findOne(id);
  }

  @Post(':id/approve')
  @RequirePermissions('products.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve Product (Admin)',
    description: 'Transitions a SUBMITTED product to APPROVED status.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product approved' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.productsService.approve(id, actor.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('products.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject Product (Admin)',
    description: 'Rejects a SUBMITTED product with a reason, sending it back to REJECTED.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product rejected' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectProductDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.productsService.reject(id, dto.reason, actor.sub);
  }

  @Post(':id/publish')
  @RequirePermissions('products.publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish Product to Marketplace (Admin)',
    description: 'Publishes an APPROVED product, making it visible in the global marketplace.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product published to marketplace' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.productsService.publish(id, actor.sub);
  }
}
