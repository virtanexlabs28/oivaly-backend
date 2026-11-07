import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Store } from './entities/store.entity.js';
import { StoreAdmin } from './entities/store-admin.entity.js';
import { StoresService } from './stores.service.js';
import { StoresController } from './stores.controller.js';
import { StoreProfileController } from './store-profile.controller.js';
import { StoreEventsService } from './events/store-events.service.js';
import { StoreContextGuard } from './guards/store-context.guard.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Store, StoreAdmin]),
    AuditModule,
  ],
  controllers: [StoresController, StoreProfileController],
  providers: [StoresService, StoreEventsService, StoreContextGuard],
  exports: [StoresService, StoreEventsService, StoreContextGuard, TypeOrmModule],
})
export class StoresModule {}

