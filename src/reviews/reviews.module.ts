import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ProductReview } from './entities/product-review.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { ReviewsService } from './reviews.service.js';
import { MarketplaceReviewsController } from './controllers/marketplace-reviews.controller.js';
import { CustomerReviewsController } from './controllers/customer-reviews.controller.js';
import { AdminReviewsController } from './controllers/admin-reviews.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProductReview,
      Product,
      Order,
      OrderItem,
    ]),
    AuditModule,
  ],
  controllers: [
    MarketplaceReviewsController,
    CustomerReviewsController,
    AdminReviewsController,
  ],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
