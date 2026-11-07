import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Cart } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { InventoryReservation } from '../orders/entities/inventory-reservation.entity.js';
import { AuditModule } from '../audit/audit.module.js';
import { CartService } from './cart.service.js';
import { CartController } from './cart.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Cart,
      CartItem,
      Product,
      ProductVariant,
      Store,
      InventoryReservation,
    ]),
    AuditModule,
  ],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
