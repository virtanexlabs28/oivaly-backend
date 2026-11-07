import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';

import { User } from '../users/entities/user.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { StoreEventsService } from '../stores/events/store-events.service.js';
import { AuditModule } from '../audit/audit.module.js';
import { StoreAuthController } from './store-auth.controller.js';
import { StoreAuthService } from './store-auth.service.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole, Store, StoreAdmin]),
    JwtModule.register({}),
    ConfigModule,
    AuditModule,
  ],
  controllers: [StoreAuthController],
  providers: [StoreAuthService, StoreEventsService],
  exports: [StoreAuthService],
})
export class StoreAuthModule {}
