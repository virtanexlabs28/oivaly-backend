import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Invoice } from './entities/invoice.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { NotificationsModule } from '../notifications/notifications.module.js';

import { InvoicesService } from './invoices.service.js';
import { CustomerInvoicesController } from './controllers/customer-invoices.controller.js';
import { StoreInvoicesController } from './controllers/store-invoices.controller.js';
import { AdminInvoicesController } from './controllers/admin-invoices.controller.js';
import { StoreContextGuard } from '../stores/guards/store-context.guard.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Invoice,
      Order,
      Store,
      StoreAdmin,
    ]),
    NotificationsModule,
  ],
  controllers: [
    CustomerInvoicesController,
    StoreInvoicesController,
    AdminInvoicesController,
  ],
  providers: [
    InvoicesService,
    StoreContextGuard,
  ],
  exports: [InvoicesService],
})
export class InvoicesModule {}
