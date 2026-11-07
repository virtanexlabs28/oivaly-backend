import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SellerTransaction } from './entities/seller-transaction.entity.js';
import { StoreBalance } from './entities/store-balance.entity.js';
import { StorePayout } from './entities/store-payout.entity.js';
import { StorePayoutSettings } from './entities/store-payout-settings.entity.js';
import { PlatformSettings } from './entities/platform-settings.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

import { PayoutsService } from './payouts.service.js';
import { PlatformSettingsService } from './platform-settings.service.js';
import { PayoutsClearanceScheduler } from './payouts-clearance.scheduler.js';
import { StoreSalesController } from './controllers/store-sales.controller.js';
import { StorePayoutsController } from './controllers/store-payouts.controller.js';
import { AdminPayoutsController } from './controllers/admin-payouts.controller.js';
import { AdminPlatformSettingsController } from './controllers/admin-platform-settings.controller.js';
import { StoreContextGuard } from '../stores/guards/store-context.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SellerTransaction,
      StoreBalance,
      StorePayout,
      StorePayoutSettings,
      PlatformSettings,
      Store,
      StoreAdmin,
      OrderItem,
    ]),
    NotificationsModule,
  ],
  controllers: [
    StoreSalesController,
    StorePayoutsController,
    AdminPayoutsController,
    AdminPlatformSettingsController,
  ],
  providers: [
    PayoutsService,
    PlatformSettingsService,
    PayoutsClearanceScheduler,
    StoreContextGuard,
  ],
  exports: [PayoutsService, PlatformSettingsService],
})
export class PayoutsModule {}
