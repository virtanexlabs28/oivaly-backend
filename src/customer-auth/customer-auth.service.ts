import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

import { User } from '../users/entities/user.entity.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { Role } from '../roles/entities/role.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { CUSTOMER_ROLE } from '../common/constants/app.constants.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

import { RegisterCustomerDto } from './dto/register-customer.dto.js';
import { LoginCustomerDto } from './dto/login-customer.dto.js';
import { VerifyEmailDto } from './dto/verify-email.dto.js';
import { ForgotPasswordDto } from './dto/forgot-password.dto.js';
import { ResetPasswordDto } from './dto/reset-password.dto.js';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto.js';
import type { JwtPayload, JwtRefreshPayload } from '../common/types/auth.types.js';

export interface CustomerAuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    phone: string | null;
    isEmailVerified: boolean;
    role: string;
  };
}

@Injectable()
export class CustomerAuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(UserRole)
    private readonly userRoleRepo: Repository<UserRole>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // 1. REGISTRATION
  // ──────────────────────────────────────────────────────────────────────────

  async register(dto: RegisterCustomerDto, ip?: string, userAgent?: string) {
    const existing = await this.userRepo.findOne({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException(`An account with email ${dto.email} already exists`);
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const verificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = this.userRepo.create({
      email: dto.email,
      name: dto.name,
      phone: dto.phone ?? null,
      passwordHash,
      status: UserStatus.ACTIVE,
      isEmailVerified: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpiresAt: verificationExpiresAt,
    });

    const savedUser = await this.userRepo.save(user);

    // Assign CUSTOMER role
    let customerRole = await this.roleRepo.findOne({ where: { name: CUSTOMER_ROLE } });
    if (!customerRole) {
      customerRole = await this.roleRepo.save(
        this.roleRepo.create({
          name: CUSTOMER_ROLE,
          description: 'Default role for registered marketplace retail customers',
        }),
      );
    }

    await this.userRoleRepo.save(
      this.userRoleRepo.create({
        userId: savedUser.id,
        roleId: customerRole.id,
      }),
    );

    // Dispatch verification email
    await this.notificationsService.sendCustomerVerificationEmail(
      savedUser.email,
      savedUser.name,
      verificationToken,
    );

    await this.auditService.log({
      actorUserId: savedUser.id,
      action: AuditAction.CUSTOMER_REGISTERED,
      resource: 'user',
      resourceId: savedUser.id,
      ipAddress: ip,
      userAgent,
      metadata: { email: savedUser.email },
    });

    return {
      message:
        'Registration successful. Please check your email to verify your account.',
      userId: savedUser.id,
      email: savedUser.email,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. EMAIL VERIFICATION
  // ──────────────────────────────────────────────────────────────────────────

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.emailVerificationToken')
      .where('u.emailVerificationToken = :token', { token: dto.token })
      .getOne();

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (
      user.emailVerificationExpiresAt &&
      user.emailVerificationExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Verification token has expired. Please request a new one.');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiresAt = null;
    await this.userRepo.save(user);

    await this.auditService.log({
      actorUserId: user.id,
      action: AuditAction.CUSTOMER_EMAIL_VERIFIED,
      resource: 'user',
      resourceId: user.id,
    });

    return { message: 'Email address verified successfully' };
  }

  async resendVerification(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Do not disclose user existence
      return { message: 'If this account exists, a new verification link has been sent.' };
    }

    if (user.isEmailVerified) {
      return { message: 'Email is already verified' };
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    user.emailVerificationToken = verificationToken;
    user.emailVerificationExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await this.userRepo.save(user);

    await this.notificationsService.sendCustomerVerificationEmail(
      user.email,
      user.name,
      verificationToken,
    );

    return { message: 'A new verification email has been dispatched.' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. LOGIN
  // ──────────────────────────────────────────────────────────────────────────

  async login(
    dto: LoginCustomerDto,
    ip?: string,
    userAgent?: string,
  ): Promise<CustomerAuthTokens> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .leftJoinAndSelect('u.userRoles', 'ur')
      .leftJoinAndSelect('ur.role', 'r')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(`Account is ${user.status.toLowerCase()}`);
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update lastLoginAt
    user.lastLoginAt = new Date();
    await this.userRepo.save(user);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      permissions: [],
      isSuperAdmin: false,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
    };

    const accessToken = await this.jwtService.signAsync(
      payload as unknown as Record<string, unknown>,
      {
        secret: this.configService.get<string>(
          'JWT_SECRET',
          'default-jwt-secret-key-min-32-chars',
        ),
        expiresIn: this.configService.get<string>('JWT_EXPIRES_IN', '15m') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      refreshPayload as unknown as Record<string, unknown>,
      {
        secret: this.configService.get<string>(
          'JWT_REFRESH_SECRET',
          'default-jwt-refresh-secret-min-32',
        ),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d') as `${number}${'s' | 'm' | 'h' | 'd'}`,
      },
    );


    await this.auditService.log({
      actorUserId: user.id,
      action: AuditAction.LOGIN,
      resource: 'customer_auth',
      resourceId: user.id,
      ipAddress: ip,
      userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        isEmailVerified: user.isEmailVerified,
        role: CUSTOMER_ROLE,
      },
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. FORGOT & RESET PASSWORD
  // ──────────────────────────────────────────────────────────────────────────

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } });
    if (!user) {
      return { message: 'If an account with that email exists, password reset instructions have been sent.' };
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepo.save(user);

    await this.notificationsService.sendPasswordResetEmail(
      user.email,
      user.name,
      resetToken,
    );

    return { message: 'Password reset instructions have been dispatched.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordResetToken')
      .where('u.passwordResetToken = :token', { token: dto.token })
      .getOne();

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (
      user.passwordResetExpiresAt &&
      user.passwordResetExpiresAt.getTime() < Date.now()
    ) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    user.passwordHash = await bcrypt.hash(dto.newPassword, 10);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.userRepo.save(user);

    await this.auditService.log({
      actorUserId: user.id,
      action: AuditAction.CUSTOMER_PASSWORD_RESET,
      resource: 'user',
      resourceId: user.id,
    });

    return { message: 'Password has been reset successfully. You can now log in.' };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PROFILE MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId },
      relations: { addresses: true },
    });
    if (!user) {
      throw new NotFoundException('Customer profile not found');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      status: user.status,
      isEmailVerified: user.isEmailVerified,
      addresses: user.addresses,
      createdAt: user.createdAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Customer profile not found');
    }

    if (dto.name !== undefined) user.name = dto.name;
    if (dto.phone !== undefined) user.phone = dto.phone;

    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.CUSTOMER_PROFILE_UPDATED,
      resource: 'user',
      resourceId: userId,
      metadata: { name: saved.name, phone: saved.phone },
    });

    return this.getProfile(userId);
  }
}
