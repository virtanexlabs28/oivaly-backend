import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../users/entities/user.entity.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import type { AuthTokens, JwtPayload, JwtRefreshPayload } from '../common/types/auth.types.js';
import { SUPER_ADMIN_ROLE } from '../common/constants/app.constants.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private auditService: AuditService,
  ) {}

  async login(
    email: string,
    password: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<AuthTokens & { user: Omit<User, 'passwordHash'> }> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: email.toLowerCase() })
      .getOne();

    if (!user) throw new UnauthorizedException('Invalid credentials');

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    await this.userRepo.update(user.id, { lastLoginAt: new Date() });

    const tokens = await this.generateTokens(user);

    await this.auditService.log({
      actorUserId: user.id,
      action: AuditAction.LOGIN,
      resource: 'auth',
      resourceId: user.id,
      ipAddress,
      userAgent,
    });

    const { passwordHash: _ph, ...safeUser } = user;
    return { ...tokens, user: safeUser };
  }

  async logout(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.LOGOUT,
      resource: 'auth',
      resourceId: userId,
      ipAddress,
      userAgent,
    });
  }

  async refresh(payload: JwtRefreshPayload): Promise<AuthTokens> {
    const user = await this.userRepo.findOne({ where: { id: payload.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('User not found or inactive');
    }
    return this.generateTokens(user);
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();

    if (!user) throw new UnauthorizedException('User not found');

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) throw new BadRequestException('Current password is incorrect');

    const hash = await bcrypt.hash(newPassword, 12);
    await this.userRepo.update(userId, { passwordHash: hash });

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.PASSWORD_CHANGED,
      resource: 'auth',
      resourceId: userId,
      ipAddress,
      userAgent,
    });
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async generateTokens(user: User): Promise<AuthTokens> {
    const permissions = await this.resolvePermissions(user.id);
    const isSuperAdmin = await this.checkIsSuperAdmin(user.id);

    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      permissions,
      isSuperAdmin,
    };

    const refreshPayload: JwtRefreshPayload = {
      sub: user.id,
      email: user.email,
    };

    const jwtSecret = this.configService.get<string>('JWT_SECRET') as string;
    const jwtExpiry = this.configService.get<string>('JWT_EXPIRES_IN', '15m');
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

  private async checkIsSuperAdmin(userId: string): Promise<boolean> {
    const count = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'r')
      .where('ur.userId = :userId', { userId })
      .andWhere('r.name = :name', { name: SUPER_ADMIN_ROLE })
      .getCount();
    return count > 0;
  }
}
