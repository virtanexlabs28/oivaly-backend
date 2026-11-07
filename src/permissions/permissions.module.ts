import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from './entities/permission.entity.js';
import { RolePermission } from './entities/role-permission.entity.js';
import { PermissionsService } from './permissions.service.js';
import { PermissionsController } from './permissions.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Permission, RolePermission]),
    AuditModule,
  ],
  controllers: [PermissionsController],
  providers: [PermissionsService],
  exports: [PermissionsService, TypeOrmModule],
})
export class PermissionsModule {}
