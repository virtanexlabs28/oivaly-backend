import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, UserRole, Role]),
    AuditModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
