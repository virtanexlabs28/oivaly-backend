import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { User } from '../users/entities/user.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { CustomerAddress } from './entities/customer-address.entity.js';
import { CustomerAuthService } from './customer-auth.service.js';
import { CustomerAddressService } from './customer-address.service.js';
import { CustomerAuthController } from './customer-auth.controller.js';
import { CustomerAddressController } from './customer-address.controller.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Role, UserRole, CustomerAddress]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'default-jwt-secret-key-min-32-chars'),
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),

    }),
    AuditModule,
  ],
  controllers: [CustomerAuthController, CustomerAddressController],
  providers: [CustomerAuthService, CustomerAddressService],
  exports: [CustomerAuthService, CustomerAddressService],
})
export class CustomerAuthModule {}
