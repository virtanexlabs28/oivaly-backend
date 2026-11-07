import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Product } from './entities/product.entity.js';
import { ProductVariant } from './entities/product-variant.entity.js';
import { ProductImage } from './entities/product-image.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { ProductReview } from '../reviews/entities/product-review.entity.js';

import { ProductsService } from './products.service.js';
import { StoreProductsController } from './controllers/store-products.controller.js';
import { AdminProductsController } from './controllers/admin-products.controller.js';
import { MarketplaceController } from './controllers/marketplace.controller.js';

import { StoresModule } from '../stores/stores.module.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductVariant,
      ProductImage,
      Category,
      Store,
      StoreAdmin,
      ProductReview,
    ]),
    StoresModule,
    AuditModule,
  ],
  controllers: [
    StoreProductsController,
    AdminProductsController,
    MarketplaceController,
  ],
  providers: [ProductsService],
  exports: [ProductsService, TypeOrmModule],
})
export class ProductsModule {}
