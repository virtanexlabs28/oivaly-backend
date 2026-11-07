import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { RolePermission } from '../permissions/entities/role-permission.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { Category } from '../categories/entities/category.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { ProductImage } from '../products/entities/product-image.entity.js';
import { Cart } from '../cart/entities/cart.entity.js';
import { CartItem } from '../cart/entities/cart-item.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { StoreOrder } from '../orders/entities/store-order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { InventoryReservation } from '../orders/entities/inventory-reservation.entity.js';
import { CustomerAddress } from '../customer-auth/entities/customer-address.entity.js';
import { ReturnRequest } from '../returns/entities/return-request.entity.js';
import { ProductReview } from '../reviews/entities/product-review.entity.js';
import { Invoice } from '../invoices/entities/invoice.entity.js';
import { Payment } from '../payments/entities/payment.entity.js';
import { StorePayout } from '../payouts/entities/store-payout.entity.js';
import { StoreBalance } from '../payouts/entities/store-balance.entity.js';
import { SellerTransaction } from '../payouts/entities/seller-transaction.entity.js';
import { PlatformSettings } from '../payouts/entities/platform-settings.entity.js';
import { StorePayoutSettings } from '../payouts/entities/store-payout-settings.entity.js';
import { AdminSeed } from './seeds/admin.seed.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Role,
      UserRole,
      Permission,
      RolePermission,
      Store,
      StoreAdmin,
      Category,
      Product,
      ProductVariant,
      ProductImage,
      Cart,
      CartItem,
      Order,
      StoreOrder,
      OrderItem,
      InventoryReservation,
      CustomerAddress,
      ReturnRequest,
      ProductReview,
      Invoice,
      Payment,
      StorePayout,
      StoreBalance,
      SellerTransaction,
      PlatformSettings,
      StorePayoutSettings,
    ]),
  ],
  providers: [AdminSeed],
})

export class DatabaseModule {}
