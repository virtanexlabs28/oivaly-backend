import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Role } from './entities/role.entity.js';
import { UserRole } from './entities/user-role.entity.js';
import { RolePermission } from '../permissions/entities/role-permission.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { RolesService } from './roles.service.js';
import { RolesController } from './roles.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Role, UserRole, RolePermission, Permission]),
    AuditModule,
  ],
  controllers: [RolesController],
  providers: [RolesService],
  exports: [RolesService, TypeOrmModule],
})
export class RolesModule {}
