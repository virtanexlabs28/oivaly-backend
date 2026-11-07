import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { CustomerAuthService } from './customer-auth.service.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { CUSTOMER_ROLE } from '../common/constants/app.constants.js';

describe('CustomerAuthService', () => {
  let service: CustomerAuthService;
  let userRepo: any;
  let roleRepo: any;
  let userRoleRepo: any;
  let jwtService: any;
  let configService: any;
  let auditService: any;
  let notificationsService: any;

  beforeEach(() => {
    userRepo = {
      findOne: vi.fn(),
      create: vi.fn((data) => ({ ...data, id: 'user-uuid-1' })),
      save: vi.fn((user) => Promise.resolve({ ...user, id: user.id || 'user-uuid-1' })),
      createQueryBuilder: vi.fn(),
    };

    roleRepo = {
      findOne: vi.fn().mockResolvedValue({ id: 'role-customer-id', name: CUSTOMER_ROLE }),
      create: vi.fn((data) => ({ ...data, id: 'role-customer-id' })),
      save: vi.fn((role) => Promise.resolve(role)),
    };

    userRoleRepo = {
      create: vi.fn((data) => data),
      save: vi.fn((ur) => Promise.resolve(ur)),
    };

    jwtService = {
      signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
    };

    configService = {
      get: vi.fn((key: string, defaultVal?: any) => {
        if (key === 'JWT_SECRET') return 'supersecretkey123456789012345678';
        if (key === 'JWT_EXPIRES_IN') return '15m';
        if (key === 'JWT_REFRESH_SECRET') return 'supersecretrefresh12345678901234';
        if (key === 'JWT_REFRESH_EXPIRES_IN') return '7d';
        return defaultVal;
      }),
    };

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      sendCustomerVerificationEmail: vi.fn().mockResolvedValue(true),
      sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
    };

    service = new CustomerAuthService(
      userRepo,
      roleRepo,
      userRoleRepo,
      jwtService,
      configService,
      auditService,
      notificationsService,
    );
  });

  describe('REGISTRATION & VERIFICATION', () => {
    it('should successfully register a new customer, assign CUSTOMER role, and dispatch verification email', async () => {
      userRepo.findOne.mockResolvedValue(null);

      const result = await service.register({
        name: 'Matti Meikäläinen',
        email: 'matti@example.fi',
        password: 'Password123!',
        phone: '+358401234567',
      });

      expect(result.message).toContain('Registration successful');
      expect(result.email).toBe('matti@example.fi');
      expect(userRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'matti@example.fi',
          name: 'Matti Meikäläinen',
          status: UserStatus.ACTIVE,
          isEmailVerified: false,
        }),
      );
      expect(notificationsService.sendCustomerVerificationEmail).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CUSTOMER_REGISTERED' }),
      );
    });

    it('should throw ConflictException if email is already in use', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'existing-id', email: 'matti@example.fi' });

      await expect(
        service.register({
          name: 'Matti Meikäläinen',
          email: 'matti@example.fi',
          password: 'Password123!',
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('should verify email with valid token', async () => {
      const mockUser = {
        id: 'user-uuid-1',
        email: 'matti@example.fi',
        isEmailVerified: false,
        emailVerificationToken: 'valid-token',
        emailVerificationExpiresAt: new Date(Date.now() + 100000),
      };

      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(mockUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.verifyEmail({ token: 'valid-token' });
      expect(result.message).toContain('verified successfully');
      expect(mockUser.isEmailVerified).toBe(true);
      expect(userRepo.save).toHaveBeenCalledWith(mockUser);
    });

    it('should throw BadRequestException if token is expired', async () => {
      const expiredUser = {
        id: 'user-uuid-1',
        emailVerificationExpiresAt: new Date(Date.now() - 100000), // in the past
      };

      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(expiredUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(service.verifyEmail({ token: 'expired-token' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('LOGIN & STATUS CONTROLS', () => {
    it('should deny login if account status is SUSPENDED or INACTIVE', async () => {
      const suspendedUser = {
        id: 'user-1',
        email: 'suspended@example.fi',
        passwordHash: '$2b$10$abcdefg',
        status: UserStatus.SUSPENDED,
      };

      const qb = {
        addSelect: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(suspendedUser),
      };
      userRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.login({ email: 'suspended@example.fi', password: 'Password123!' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
