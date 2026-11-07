import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { User } from '../users/entities/user.entity.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { Role } from '../roles/entities/role.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreAdmin } from '../stores/entities/store-admin.entity.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';
import { StoreSignupDto } from './dto/store-signup.dto.js';
import { StoreLoginDto } from './dto/store-login.dto.js';
import { StoreEventsService } from '../stores/events/store-events.service.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import {
  STORE_ADMIN_ROLE,
  STORE_ADMIN_DEFAULT_PERMISSIONS,
} from '../common/constants/app.constants.js';
import type { AuthTokens, JwtPayload, JwtRefreshPayload } from '../common/types/auth.types.js';

export interface StoreAdminAuthResponse extends AuthTokens {
  user: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    status: StoreStatus;
  };
}

export interface StoreAdminProfileResponse {
  user: {
    id: string;
    name: string;
    email: string;
  };
  store: {
    id: string;
    name: string;
    status: StoreStatus;
  };
  role: string;
  permissions: string[];
}

@Injectable()
export class StoreAuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(StoreAdmin) private storeAdminRepo: Repository<StoreAdmin>,
    private dataSource: DataSource,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
    private storeEventsService: StoreEventsService,
  ) {}

  /**
   * Vendor / Store Admin Signup
   * Automatically creates User, assigns STORE_ADMIN role, creates Store in UNDER_REVIEW status,
   * links user as StoreAdmin, fires event hooks, and records audit trail.
   */
  async signup(
    dto: StoreSignupDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<{
    message: string;
    store: { id: string; name: string; status: StoreStatus };
    user: { id: string; name: string; email: string };
  }> {
    // 1. Check duplicate email
    const existingUser = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existingUser) {
      throw new ConflictException('An account with this email address already exists');
    }

    // 2. Check duplicate store name
    const existingStoreName = await this.storeRepo.findOne({
      where: { name: dto.storeName },
    });
    if (existingStoreName) {
      throw new ConflictException('A store with this name already exists');
    }

    // 3. Check duplicate business identifier
    const existingBusinessId = await this.storeRepo.findOne({
      where: { businessId: dto.businessId },
    });
    if (existingBusinessId) {
      throw new ConflictException('A store with this Business ID / Y-tunnus already exists');
    }

    // 4. Securely hash password
    const passwordHash = await bcrypt.hash(dto.password, 12);

    // 5. Execute creation within a managed database transaction
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdUser: User;
    let createdStore: Store;

    try {
      // 5a. Create user
      const user = queryRunner.manager.create(User, {
        name: dto.contactName,
        email: dto.email.toLowerCase(),
        passwordHash,
        status: UserStatus.ACTIVE,
      });
      createdUser = await queryRunner.manager.save(user);

      // 5b. Find or create STORE_ADMIN role
      let storeAdminRole = await queryRunner.manager.findOne(Role, {
        where: { name: STORE_ADMIN_ROLE },
      });
      if (!storeAdminRole) {
        storeAdminRole = await queryRunner.manager.save(
          queryRunner.manager.create(Role, {
            name: STORE_ADMIN_ROLE,
            description: 'Store Administrator with store-level access',
          }),
        );
      }

      // 5c. Assign STORE_ADMIN role to user
      await queryRunner.manager.save(
        queryRunner.manager.create(UserRole, {
          userId: createdUser.id,
          roleId: storeAdminRole.id,
        }),
      );

      // 5d. Create Store in UNDER_REVIEW status
      const store = queryRunner.manager.create(Store, {
        name: dto.storeName,
        legalBusinessName: dto.legalBusinessName,
        businessId: dto.businessId,
        vatId: dto.vatId ?? null,
        address: dto.businessAddress,
        phone: dto.phone,
        contactName: dto.contactName,
        sellerAgreementAccepted: true,
        status: StoreStatus.UNDER_REVIEW,
      });
      createdStore = await queryRunner.manager.save(store);

      // 5e. Link User and Store via StoreAdmin
      await queryRunner.manager.save(
        queryRunner.manager.create(StoreAdmin, {
          userId: createdUser.id,
          storeId: createdStore.id,
        }),
      );

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }

    // 6. Dispatch transactional email hook
    this.storeEventsService.emitApplicationSubmitted(createdStore, {
      name: dto.contactName,
      email: dto.email,
    });

    // 7. Audit log the application submission
    await this.auditService.log({
      actorUserId: createdUser.id,
      action: AuditAction.STORE_APPLICATION_SUBMITTED,
      resource: 'stores',
      resourceId: createdStore.id,
      metadata: {
        storeName: createdStore.name,
        legalBusinessName: createdStore.legalBusinessName,
        businessId: createdStore.businessId,
        email: createdUser.email,
        status: StoreStatus.UNDER_REVIEW,
      },
      ipAddress,
      userAgent,
    });

    return {
      message:
        'Store application submitted successfully. Your application is currently under review by platform administrators.',
      store: {
        id: createdStore.id,
        name: createdStore.name,
        status: createdStore.status,
      },
      user: {
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
      },
    };
  }

  /**
   * Store Admin Login
   * Verifies credentials, verifies STORE_ADMIN role, checks store status,
   * generates tokens, and records audit trail.
   */
  async login(
    dto: StoreLoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<StoreAdminAuthResponse> {
    // 1. Find user with password hash
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 2. Verify password
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // 3. Verify user account status
    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    // 4. Verify user is a Store Admin
    const isStoreAdmin =
      (await this.userRoleRepo
        .createQueryBuilder('ur')
        .innerJoin('ur.role', 'r')
        .where('ur.userId = :userId', { userId: user.id })
        .andWhere('r.name = :name', { name: STORE_ADMIN_ROLE })
        .getCount()) > 0;

    if (!isStoreAdmin) {
      throw new UnauthorizedException('Account is not registered as a Store Administrator');
    }

    // 5. Retrieve associated store
    const storeAdmin = await this.storeAdminRepo.findOne({
      where: { userId: user.id },
      relations: { store: true },
    });

    if (!storeAdmin || !storeAdmin.store) {
      throw new NotFoundException('No store found associated with this account');
    }

    const store = storeAdmin.store;

    // 6. Strict store status evaluation
    if (store.status === StoreStatus.UNDER_REVIEW) {
      throw new ForbiddenException(
        'Your store application is currently under review by platform administrators. Access to the Store Admin dashboard is pending approval.',
      );
    }

    if (store.status === StoreStatus.PENDING) {
      throw new ForbiddenException(
        'Your store application is pending review. Access to the Store Admin dashboard is pending approval.',
      );
    }

    if (store.status === StoreStatus.REJECTED) {
      const reasonSuffix = store.rejectionReason
        ? `: ${store.rejectionReason}`
        : '. Please contact platform support.';
      throw new ForbiddenException(`Your store application was rejected${reasonSuffix}`);
    }

    if (store.status === StoreStatus.SUSPENDED) {
      const reasonSuffix = store.suspensionReason
        ? `: ${store.suspensionReason}`
        : '. Please contact platform support.';
      throw new ForbiddenException(`Your store has been suspended${reasonSuffix}`);
    }

    // If store was APPROVED, transition to ACTIVE upon first successful login
    if (store.status === StoreStatus.APPROVED) {
      store.status = StoreStatus.ACTIVE;
      await this.storeRepo.save(store);
      this.storeEventsService.emitStoreActivated(store, user.email);
    }

    // 7. Update lastLoginAt
    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    // 8. Generate JWT tokens
    const tokens = await this.generateTokens(user);

    // 9. Audit log
    await this.auditService.log({
      actorUserId: user.id,
      action: AuditAction.STORE_ADMIN_LOGIN,
      resource: 'stores',
      resourceId: store.id,
      metadata: {
        storeName: store.name,
        storeStatus: store.status,
      },
      ipAddress,
      userAgent,
    });

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
      },
    };
  }

  /**
   * Get authenticated Store Admin profile with store & permissions
   */
  async getProfile(userId: string): Promise<StoreAdminProfileResponse> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const storeAdmin = await this.storeAdminRepo.findOne({
      where: { userId },
      relations: { store: true },
    });

    if (!storeAdmin || !storeAdmin.store) {
      throw new NotFoundException('No store found associated with this account');
    }

    const permissions = await this.resolvePermissions(userId);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      store: {
        id: storeAdmin.store.id,
        name: storeAdmin.store.name,
        status: storeAdmin.store.status,
      },
      role: STORE_ADMIN_ROLE,
      permissions,
    };
  }

  /**
   * Seller / Store Admin Forgot Password
   */
  async forgotPassword(email: string): Promise<{ message: string; resetToken?: string }> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      return {
        message: 'If a store account exists with this email, password reset instructions have been dispatched.',
      };
    }

    const resetToken = crypto.randomBytes(24).toString('hex');
    user.passwordResetToken = resetToken;
    user.passwordResetExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await this.userRepo.save(user);

    return {
      message: 'Password reset instructions have been dispatched.',
      resetToken,
    };
  }

  /**
   * Seller / Store Admin Reset Password
   */
  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordResetToken')
      .where('u.passwordResetToken = :token', { token })
      .getOne();

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    if (user.passwordResetExpiresAt && user.passwordResetExpiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Password reset token has expired. Please request a new one.');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 12);
    user.passwordResetToken = null;
    user.passwordResetExpiresAt = null;
    await this.userRepo.save(user);

    await this.auditService.log({
      actorUserId: user.id,
      action: AuditAction.PASSWORD_CHANGED,
      resource: 'users',
      resourceId: user.id,
    });

    return { message: 'Your store password has been successfully reset. You can now log in.' };
  }

  /**
   * Refresh Store Admin tokens
   */
  async refreshSession(refreshTokenString: string): Promise<StoreAdminAuthResponse> {
    if (!refreshTokenString) {
      throw new BadRequestException('Refresh token is required');
    }

    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') as string;
    let payload: JwtRefreshPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(refreshTokenString, {
        secret: refreshSecret,
      });
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User account is inactive or not found');
    }

    const storeAdmin = await this.storeAdminRepo.findOne({
      where: { userId: user.id },
      relations: { store: true },
    });

    if (!storeAdmin || !storeAdmin.store) {
      throw new NotFoundException('No store found associated with this account');
    }

    const store = storeAdmin.store;
    if (store.status === StoreStatus.SUSPENDED || store.status === StoreStatus.REJECTED) {
      throw new ForbiddenException(`Store is ${store.status}`);
    }

    const tokens = await this.generateTokens(user);

    return {
      ...tokens,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      store: {
        id: store.id,
        name: store.name,
        status: store.status,
      },
    };
  }

  // ─── Finnish Business ID (Y-tunnus) Verification via PRH / YTJ Open Data API ───────────

  /**
   * Verifies a Finnish Business ID (Y-tunnus) against the official PRH / YTJ Open Data API.
   * Endpoint: https://avoindata.prh.fi/opendata-ytj-api/v3/companies?businessId=1234567-8
   */
  async verifyBusinessId(rawBusinessId: string) {
    if (!rawBusinessId || typeof rawBusinessId !== 'string') {
      throw new BadRequestException('A valid Finnish Business ID (Y-tunnus) is required');
    }

    // Normalize: strip whitespace
    let cleanId = rawBusinessId.trim().replace(/\s+/g, '');

    // Format 8 continuous digits into 7 digits + hyphen + 1 check digit (e.g. 01120389 -> 0112038-9)
    if (/^\d{8}$/.test(cleanId)) {
      cleanId = `${cleanId.slice(0, 7)}-${cleanId.slice(7)}`;
    }

    const prhBaseUrl =
      this.configService.get<string>('PRH_YTJ_API_URL') ||
      process.env.PRH_YTJ_API_URL ||
      'https://avoindata.prh.fi/opendata-ytj-api/v3';

    const targetUrl = `${prhBaseUrl.replace(/\/+$/, '')}/companies?businessId=${encodeURIComponent(cleanId)}`;

    try {
      const response = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'OivalyMarketplace/1.0 (ArtisanVerification)',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        return {
          valid: false,
          businessId: cleanId,
          message: `PRH YTJ API returned status ${response.status}`,
        };
      }

      const data = await response.json();
      const companies = data?.companies || [];

      if (!companies.length || data?.totalResults === 0) {
        return {
          valid: false,
          businessId: cleanId,
          message: 'Business ID (Y-tunnus) not found in the Finnish Trade Register (PRH / YTJ).',
        };
      }

      const company = companies[0];
      const activeName = company?.names?.[0]?.name || company?.name || 'Registered Finnish Entity';
      const companyForm = company?.companyForms?.[0]?.name || null;
      const primaryAddress = company?.addresses?.[0] || null;
      const postOffice = primaryAddress?.postOffices?.[0]?.city || null;
      const street = primaryAddress?.street ? `${primaryAddress.street} ${primaryAddress.buildingNumber || ''}`.trim() : null;
      const postCode = primaryAddress?.postCode || null;

      return {
        valid: true,
        businessId: company?.businessId?.value || cleanId,
        companyName: activeName,
        companyForm,
        registrationDate: company?.registrationDate || company?.businessId?.registrationDate || null,
        tradeRegisterStatus: company?.tradeRegisterStatus === '1' ? 'Registered' : 'Active',
        street,
        postCode,
        city: postOffice,
        fullAddress: [street, postCode, postOffice, 'Finland'].filter(Boolean).join(', '),
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown verification error';
      return {
        valid: false,
        businessId: cleanId,
        message: `Unable to connect to Finnish PRH / YTJ registry: ${errMsg}`,
      };
    }
  }

  // ─── Private Token & Permission Helpers ─────────────────────────────────────

  private async generateTokens(user: User): Promise<AuthTokens> {
    const permissions = await this.resolvePermissions(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      permissions,
      isSuperAdmin: false,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET') as string;
    const jwtExpiry =
      this.configService.get<string>('SELLER_JWT_EXPIRES_IN') ||
      this.configService.get<string>('JWT_EXPIRES_IN', '7d');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET') as string;
    const refreshExpiry = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload as unknown as Record<string, unknown>, {
        secret: jwtSecret,
        expiresIn: jwtExpiry as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
      this.jwtService.signAsync(refreshPayload as unknown as Record<string, unknown>, {
        secret: refreshSecret,
        expiresIn: refreshExpiry as `${number}${'s' | 'm' | 'h' | 'd'}`,
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async resolvePermissions(userId: string): Promise<string[]> {
    const userRoles = await this.userRoleRepo
      .createQueryBuilder('ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rp')
      .leftJoinAndSelect('rp.permission', 'perm')
      .where('ur.userId = :userId', { userId })
      .getMany();

    const permSet = new Set<string>();
    for (const ur of userRoles) {
      for (const rp of ur.role?.rolePermissions ?? []) {
        if (rp.permission?.key) permSet.add(rp.permission.key);
      }
    }
    return [...permSet];
  }
}
