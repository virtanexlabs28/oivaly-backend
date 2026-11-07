import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { JwtRefreshStrategy } from './strategies/refresh-token.strategy.js';
import { User } from '../users/entities/user.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { AuditModule } from '../audit/audit.module.js';

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET') as string,
        signOptions: {
          expiresIn: config.get<string>('JWT_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    TypeOrmModule.forFeature([User, UserRole]),
    AuditModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule { }
