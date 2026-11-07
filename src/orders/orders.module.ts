import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { StoreOrder } from './entities/store-order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { InventoryReservation } from './entities/inventory-reservation.entity.js';
import { Cart } from '../cart/entities/cart.entity.js';
import { CartItem } from '../cart/entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { User } from '../users/entities/user.entity.js';
import { AuditModule } from '../audit/audit.module.js';
import { OrdersService } from './orders.service.js';
import { CustomerOrdersController } from './controllers/customer-orders.controller.js';
import { StoreOrdersController } from './controllers/store-orders.controller.js';
import { AdminOrdersController } from './controllers/admin-orders.controller.js';
import { StoreContextGuard } from '../stores/guards/store-context.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      StoreOrder,
      OrderItem,
      InventoryReservation,
      Cart,
      CartItem,
      Product,
      ProductVariant,
      Store,
      StoreAdmin,
      User,
    ]),
    AuditModule,
  ],
  controllers: [
    CustomerOrdersController,
    StoreOrdersController,
    AdminOrdersController,
  ],
  providers: [OrdersService, StoreContextGuard],
  exports: [OrdersService],
})
export class OrdersModule {}
