import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './entities/payment.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrdersModule } from '../orders/orders.module.js';
import { PayoutsModule } from '../payouts/payouts.module.js';
import { InvoicesModule } from '../invoices/invoices.module.js';

import { PaymentsService } from './payments.service.js';
import { PaymentsController } from './payments.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Payment, Order]),
    OrdersModule,
    PayoutsModule,
    InvoicesModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
