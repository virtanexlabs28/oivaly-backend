import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  ConflictException,
  ForbiddenException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { StoreAuthService } from './store-auth.service.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';
import { UserStatus } from '../users/enums/user-status.enum.js';
import { STORE_ADMIN_ROLE } from '../common/constants/app.constants.js';

describe('StoreAuthService', () => {
  let service: StoreAuthService;

  const mockUserRepo = {
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    update: vi.fn(),
  };

  const mockRoleRepo = {
    findOne: vi.fn(),
  };

  const mockUserRoleRepo = {
    createQueryBuilder: vi.fn(),
  };

  const mockStoreRepo = {
    findOne: vi.fn(),
    save: vi.fn(),
  };

  const mockStoreAdminRepo = {
    findOne: vi.fn(),
  };

  const mockQueryRunner = {
    connect: vi.fn(),
    startTransaction: vi.fn(),
    commitTransaction: vi.fn(),
    rollbackTransaction: vi.fn(),
    release: vi.fn(),
    manager: {
      create: vi.fn((_entity, data) => ({ id: 'mock-uuid', ...data })),
      save: vi.fn(async (entity) => ({ id: 'mock-uuid', ...entity })),
      findOne: vi.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: vi.fn(() => mockQueryRunner),
  };

  const mockJwtService = {
    signAsync: vi.fn().mockResolvedValue('mock-jwt-token'),
  };

  const mockConfigService = {
    get: vi.fn((key: string, def?: unknown) => {
      if (key === 'JWT_SECRET') return 'test-jwt-secret';
      if (key === 'JWT_REFRESH_SECRET') return 'test-refresh-secret';
      return def;
    }),
  };

  const mockAuditService = {
    log: vi.fn().mockResolvedValue(undefined),
  };

  const mockStoreEventsService = {
    emitApplicationSubmitted: vi.fn(),
    emitStoreApproved: vi.fn(),
    emitStoreRejected: vi.fn(),
    emitStoreActivated: vi.fn(),
    emitStoreSuspended: vi.fn(),
    emitStoreReactivated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new StoreAuthService(
      mockUserRepo as any,
      mockRoleRepo as any,
      mockUserRoleRepo as any,
      mockStoreRepo as any,
      mockStoreAdminRepo as any,
      mockDataSource as any,
      mockJwtService as any,
      mockConfigService as any,
      mockAuditService as any,
      mockStoreEventsService as any,
    );
  });

  describe('SIGNUP', () => {
    const signupDto = {
      storeName: 'Nordic Artisan Bakery',
      legalBusinessName: 'Nordic Bakery Oy',
      businessAddress: 'Aleksanterinkatu 15, Helsinki',
      contactName: 'Matti Meikäläinen',
      email: 'matti@nordicbakery.fi',
      phone: '+358401234567',
      password: 'SecureVendor@2026',
      businessId: '1234567-8',
      vatId: 'FI12345678',
      sellerAgreementAccepted: true,
    };

    it('should successfully submit store application with initial status UNDER_REVIEW', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null); // No existing email
      mockStoreRepo.findOne.mockResolvedValueOnce(null); // No existing store name
      mockStoreRepo.findOne.mockResolvedValueOnce(null); // No existing business ID

      mockQueryRunner.manager.findOne.mockResolvedValueOnce({
        id: 'role-uuid',
        name: STORE_ADMIN_ROLE,
      });

      const result = await service.signup(signupDto, '127.0.0.1', 'Vitest Agent');

      expect(result.store.status).toBe(StoreStatus.UNDER_REVIEW);
      expect(result.store.name).toBe(signupDto.storeName);
      expect(result.user.email).toBe(signupDto.email);
      expect((result as any).password).toBeUndefined();
      expect((result as any).passwordHash).toBeUndefined();

      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockStoreEventsService.emitApplicationSubmitted).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STORE_APPLICATION_SUBMITTED',
          resource: 'stores',
        }),
      );
    });

    it('should reject signup if email is already in use', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({ id: 'existing-user' });

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
      expect(mockQueryRunner.startTransaction).not.toHaveBeenCalled();
    });

    it('should reject signup if store name is already in use', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      mockStoreRepo.findOne.mockResolvedValueOnce({ id: 'existing-store' });

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });

    it('should reject signup if business ID is already in use', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce(null);
      mockStoreRepo.findOne.mockResolvedValueOnce(null);
      mockStoreRepo.findOne.mockResolvedValueOnce({ id: 'existing-biz' });

      await expect(service.signup(signupDto)).rejects.toThrow(ConflictException);
    });
  });

  describe('LOGIN & STATUS ENFORCEMENT', () => {
    const loginDto = {
      email: 'matti@nordicbakery.fi',
      password: 'SecureVendor@2026',
    };

    const mockHashedPassword = bcrypt.hashSync('SecureVendor@2026', 10);

    const setupLoginUser = (userOverrides = {}, isStoreAdmin = true) => {
      const qbMock = {
        addSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue({
          id: 'user-uuid',
          email: 'matti@nordicbakery.fi',
          passwordHash: mockHashedPassword,
          status: UserStatus.ACTIVE,
          ...userOverrides,
        }),
      };
      mockUserRepo.createQueryBuilder.mockReturnValue(qbMock);

      const urQbMock = {
        innerJoin: vi.fn().mockReturnThis(),
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getCount: vi.fn().mockResolvedValue(isStoreAdmin ? 1 : 0),
        getMany: vi.fn().mockResolvedValue([
          {
            role: {
              rolePermissions: [
                { permission: { key: 'stores.read' } },
                { permission: { key: 'stores.update' } },
              ],
            },
          },
        ]),
      };
      mockUserRoleRepo.createQueryBuilder.mockReturnValue(urQbMock);
    };

    it('should reject login if password is incorrect', async () => {
      setupLoginUser();

      await expect(
        service.login({ email: loginDto.email, password: 'WrongPassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should reject login if user is not a STORE_ADMIN', async () => {
      setupLoginUser({}, false);

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should deny login when store status is UNDER_REVIEW', async () => {
      setupLoginUser();
      mockStoreAdminRepo.findOne.mockResolvedValueOnce({
        userId: 'user-uuid',
        storeId: 'store-uuid',
        store: {
          id: 'store-uuid',
          name: 'Nordic Bakery',
          status: StoreStatus.UNDER_REVIEW,
        },
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should deny login when store status is REJECTED', async () => {
      setupLoginUser();
      mockStoreAdminRepo.findOne.mockResolvedValueOnce({
        userId: 'user-uuid',
        storeId: 'store-uuid',
        store: {
          id: 'store-uuid',
          name: 'Nordic Bakery',
          status: StoreStatus.REJECTED,
          rejectionReason: 'Invalid documentation',
        },
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should deny login when store status is SUSPENDED', async () => {
      setupLoginUser();
      mockStoreAdminRepo.findOne.mockResolvedValueOnce({
        userId: 'user-uuid',
        storeId: 'store-uuid',
        store: {
          id: 'store-uuid',
          name: 'Nordic Bakery',
          status: StoreStatus.SUSPENDED,
          suspensionReason: 'Policy violation',
        },
      });

      await expect(service.login(loginDto)).rejects.toThrow(ForbiddenException);
    });

    it('should allow login when store status is ACTIVE', async () => {
      setupLoginUser();
      mockStoreAdminRepo.findOne.mockResolvedValueOnce({
        userId: 'user-uuid',
        storeId: 'store-uuid',
        store: {
          id: 'store-uuid',
          name: 'Nordic Bakery',
          status: StoreStatus.ACTIVE,
        },
      });

      const result = await service.login(loginDto);

      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.store.status).toBe(StoreStatus.ACTIVE);
      expect(result.store.name).toBe('Nordic Bakery');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STORE_ADMIN_LOGIN',
          resource: 'stores',
        }),
      );
    });

    it('should transition store from APPROVED to ACTIVE upon login', async () => {
      setupLoginUser();
      mockStoreAdminRepo.findOne.mockResolvedValueOnce({
        userId: 'user-uuid',
        storeId: 'store-uuid',
        store: {
          id: 'store-uuid',
          name: 'Nordic Bakery',
          status: StoreStatus.APPROVED,
        },
      });

      const result = await service.login(loginDto);

      expect(result.store.status).toBe(StoreStatus.ACTIVE);
      expect(mockStoreRepo.save).toHaveBeenCalled();
      expect(mockStoreEventsService.emitStoreActivated).toHaveBeenCalled();
    });
  });

  describe('GET PROFILE (/store-auth/me)', () => {
    it('should return store admin profile without exposing sensitive information', async () => {
      mockUserRepo.findOne.mockResolvedValueOnce({
        id: 'user-uuid',
        name: 'Matti Meikäläinen',
        email: 'matti@nordicbakery.fi',
      });

      mockStoreAdminRepo.findOne.mockResolvedValueOnce({
        userId: 'user-uuid',
        storeId: 'store-uuid',
        store: {
          id: 'store-uuid',
          name: 'Nordic Bakery',
          status: StoreStatus.ACTIVE,
        },
      });

      const urQbMock = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getMany: vi.fn().mockResolvedValueOnce([
          {
            role: {
              rolePermissions: [
                { permission: { key: 'stores.read' } },
                { permission: { key: 'stores.update' } },
              ],
            },
          },
        ]),
      };
      mockUserRoleRepo.createQueryBuilder.mockReturnValue(urQbMock);

      const profile = await service.getProfile('user-uuid');

      expect(profile.user.id).toBe('user-uuid');
      expect(profile.store.id).toBe('store-uuid');
      expect(profile.role).toBe(STORE_ADMIN_ROLE);
      expect(profile.permissions).toEqual(['stores.read', 'stores.update']);
    });
  });
});
