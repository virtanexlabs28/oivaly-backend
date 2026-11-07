import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ReturnRequest } from './entities/return-request.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { ReturnsService } from './returns.service.js';
import { CustomerReturnsController } from './controllers/customer-returns.controller.js';
import { StoreReturnsController } from './controllers/store-returns.controller.js';
import { AdminReturnsController } from './controllers/admin-returns.controller.js';
import { StoreContextGuard } from '../stores/guards/store-context.guard.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ReturnRequest,
      Order,
      OrderItem,
      Product,
      Store,
      StoreAdmin,
    ]),
    AuditModule,
  ],
  controllers: [
    CustomerReturnsController,
    StoreReturnsController,
    AdminReturnsController,
  ],
  providers: [ReturnsService, StoreContextGuard],
  exports: [ReturnsService],
})
export class ReturnsModule {}
