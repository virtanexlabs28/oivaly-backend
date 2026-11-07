import { Module } from '@nestjs/common';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { createObserveModule } from '@nestjs/observe';

import { DatabaseConnectionModule } from './database-connection/index.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { RolesModule } from './roles/roles.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { AuditModule } from './audit/audit.module.js';
import { StoresModule } from './stores/stores.module.js';
import { StoreAuthModule } from './store-auth/store-auth.module.js';
import { CategoriesModule } from './categories/categories.module.js';
import { ProductsModule } from './products/products.module.js';
import { CartModule } from './cart/cart.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { CustomerAuthModule } from './customer-auth/customer-auth.module.js';
import { ReturnsModule } from './returns/returns.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { ScheduleModule } from '@nestjs/schedule';
import { PaymentsModule } from './payments/payments.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';
import { PayoutsModule } from './payouts/payouts.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    // ── Config ──────────────────────────────────────────────────────────────
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // ── Task Scheduling (14-Day Payout Clearance Engine) ─────────────────────
    ScheduleModule.forRoot(),

    // ── Rate Limiting ────────────────────────────────────────────────────────
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ([{
        ttl: config.get<number>('THROTTLE_TTL', 60000),
        limit: config.get<number>('THROTTLE_LIMIT', 10),
      }]),
    }),

    // ── Database ─────────────────────────────────────────────────────────────
    DatabaseConnectionModule,
    DatabaseModule,

    // ── Feature Modules ───────────────────────────────────────────────────────
    NotificationsModule,
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    AuditModule,
    StoresModule,
    StoreAuthModule,
    CategoriesModule,
    ProductsModule,
    CartModule,
    OrdersModule,
    CustomerAuthModule,
    ReturnsModule,
    ReviewsModule,
    PaymentsModule,
    InvoicesModule,
    PayoutsModule,


    // ── Observability ─────────────────────────────────────────────────────────
    ObserveModule.forRoot({
      appKey: process.env['OBSERVE_APP_KEY'] ?? 'YOUR_APP_KEY',
      appSecret: process.env['OBSERVE_APP_SECRET'] ?? 'YOUR_APP_SECRET',
      serviceId: 'multi-tanent-store-backend',
    }),
  ],
  controllers: [],
  providers: [
    // Global rate-limit guard
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
