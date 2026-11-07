import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { ProductsService } from '../products.service.js';
import { CreateProductDto, CreateProductVariantDto, CreateProductImageDto } from '../dto/create-product.dto.js';
import { UpdateProductDto } from '../dto/update-product.dto.js';
import { ProductQueryDto } from '../dto/product-query.dto.js';
import { UpdateVariantInventoryDto, AdjustVariantInventoryDto } from '../dto/update-inventory.dto.js';
import { StoreContextGuard } from '../../stores/guards/store-context.guard.js';
import { CurrentStore } from '../../stores/decorators/current-store.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';
import type { Store } from '../../stores/entities/store.entity.js';

/**
 * Store Admin: Manages their own store's products and inventory.
 * All routes are protected by StoreContextGuard (tenant isolation).
 */
@ApiTags('2. Seller / Store — Products & Inventory')
@ApiBearerAuth('access-token')
@UseGuards(StoreContextGuard)
@Controller('store/products')
export class StoreProductsController {
  constructor(private readonly productsService: ProductsService) { }

  // ── Product CRUD ──────────────────────────────────────────────────────

  @Post()
  @ApiOperation({
    summary: 'Create Product (Store Admin)',
    description: 'Creates a new product in DRAFT status for the authenticated store.',
  })
  @ApiResponse({ status: 201, description: 'Product created in DRAFT status' })
  create(
    @Body() dto: CreateProductDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    if (!store?.id) {
      throw new BadRequestException('Store context is required to create a product. Please provide x-store-id header.');
    }
    return this.productsService.create(store.id, dto, actor.sub);
  }

  @Get()
  @ApiOperation({ summary: 'List Own Store Products (Store Admin)' })
  @ApiResponse({ status: 200, description: 'Paginated store products' })
  findAll(
    @Query() query: ProductQueryDto,
    @CurrentStore() store: Store,
  ) {
    if (!store?.id) {
      throw new BadRequestException('Store context is required to list products. Please provide x-store-id header.');
    }
    return this.productsService.findAll(store.id, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get Own Product Detail (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product details' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.findOne(id, storeId);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Update Product (Store Admin)',
    description: 'Updates a product. Only DRAFT or REJECTED products can be edited.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product updated' })
  @ApiResponse({ status: 400, description: 'Cannot edit in current status' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.update(id, storeId, dto, actor.sub);
  }

  @Post(':id/submit')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Submit Product for Approval (Store Admin)',
    description: 'Submits a DRAFT or REJECTED product for Platform Admin review.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product submitted for approval' })
  submit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.submit(id, storeId, actor.sub);
  }

  @Post(':id/publish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Publish Approved Product (Store Admin)',
    description: 'Publishes an APPROVED product so it becomes visible on the marketplace.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product published to marketplace' })
  publish(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.publish(id, actor.sub, storeId);
  }


  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Archive Product (Store Admin)',
    description: 'Soft-deletes (archives) a product. Removes it from the marketplace.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  archive(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.archive(id, storeId, actor.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete Product (Store Admin)',
    description: 'Hard-deletes a DRAFT or ARCHIVED product. Non-recoverable.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiResponse({ status: 200, description: 'Product deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete product in current status' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.remove(id, storeId, actor.sub);
  }

  // ── Variants ──────────────────────────────────────────────────────────

  @Post(':id/variants')
  @ApiOperation({ summary: 'Add Variant to Product (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  addVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductVariantDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.addVariant(productId, storeId, dto);
  }

  @Put(':id/variants/:variantId')
  @ApiOperation({ summary: 'Update Variant (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  updateVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: CreateProductVariantDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.updateVariant(variantId, productId, storeId, dto);
  }

  @Delete(':id/variants/:variantId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Variant (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  removeVariant(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.removeVariant(variantId, productId, storeId);
  }

  // ── Images ────────────────────────────────────────────────────────────

  @Post(':id/images')
  @ApiOperation({ summary: 'Add Image to Product (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  addImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Body() dto: CreateProductImageDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.addImage(productId, storeId, dto);
  }

  @Delete(':id/images/:imageId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete Product Image (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'imageId', description: 'Image UUID' })
  removeImage(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('imageId', ParseUUIDPipe) imageId: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.removeImage(imageId, productId, storeId);
  }

  // ── Inventory ─────────────────────────────────────────────────────────

  @Get('inventory/summary')
  @ApiOperation({
    summary: 'Get Store Inventory Summary (Store Admin)',
    description: 'Returns stock levels across all variants, with low-stock and out-of-stock flags.',
  })
  getStoreInventory(@CurrentStore() store: Store) {
    if (!store?.id) {
      throw new BadRequestException('Store context is required to get inventory summary. Please provide x-store-id header.');
    }
    return this.productsService.getStoreInventory(store.id);
  }

  @Get(':id/inventory')
  @ApiOperation({ summary: 'Get Product Inventory (Store Admin)' })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  getInventory(
    @Param('id', ParseUUIDPipe) productId: string,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.getInventory(productId, storeId!);
  }

  @Put(':id/variants/:variantId/inventory')
  @ApiOperation({
    summary: 'Set Variant Stock (Store Admin)',
    description: 'Absolute stock update — sets the stock to the exact value provided.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  setInventory(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: UpdateVariantInventoryDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.setVariantInventory(variantId, productId, storeId!, dto, actor.sub);
  }

  @Post(':id/variants/:variantId/inventory/adjust')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Adjust Variant Stock (Store Admin)',
    description: 'Delta adjustment — adds or removes from current stock quantity.',
  })
  @ApiParam({ name: 'id', description: 'Product UUID' })
  @ApiParam({ name: 'variantId', description: 'Variant UUID' })
  adjustInventory(
    @Param('id', ParseUUIDPipe) productId: string,
    @Param('variantId', ParseUUIDPipe) variantId: string,
    @Body() dto: AdjustVariantInventoryDto,
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
  ) {
    const storeId = actor?.isSuperAdmin ? undefined : store?.id;
    return this.productsService.adjustVariantInventory(variantId, productId, storeId!, dto, actor.sub);
  }
}
