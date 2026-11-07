import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';

import { StoresService } from './stores.service.js';
import { StoreStatus } from './enums/store-status.enum.js';

describe('StoresService (Platform Admin Store Management)', () => {
  let service: StoresService;

  const mockStoreRepo = {
    findOne: vi.fn(),
    createQueryBuilder: vi.fn(),
    save: vi.fn(async (store) => ({ ...store })),
  };

  const mockStoreAdminRepo = {
    findOne: vi.fn(),
  };

  const mockAuditService = {
    log: vi.fn().mockResolvedValue(undefined),
  };

  const mockStoreEventsService = {
    emitStoreApproved: vi.fn(),
    emitStoreRejected: vi.fn(),
    emitStoreActivated: vi.fn(),
    emitStoreSuspended: vi.fn(),
    emitStoreReactivated: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();

    service = new StoresService(
      mockStoreRepo as any,
      mockStoreAdminRepo as any,
      mockAuditService as any,
      mockStoreEventsService as any,
    );
  });

  const setupMockStore = (storeData: Record<string, unknown>) => {
    const qbMock = {
      leftJoinAndSelect: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      getOne: vi.fn().mockResolvedValue({
        id: 'store-uuid',
        name: 'Nordic Bakery',
        legalBusinessName: 'Nordic Bakery Oy',
        businessId: '1234567-8',
        status: StoreStatus.UNDER_REVIEW,
        storeAdmins: [{ user: { email: 'matti@nordicbakery.fi' } }],
        ...storeData,
      }),
    };
    mockStoreRepo.createQueryBuilder.mockReturnValue(qbMock);
  };

  describe('APPROVE STORE', () => {
    it('should transition store from UNDER_REVIEW to APPROVED and log audit', async () => {
      setupMockStore({ status: StoreStatus.UNDER_REVIEW });

      const updated = await service.approve('store-uuid', 'admin-uuid');

      expect(updated.status).toBe(StoreStatus.APPROVED);
      expect(mockStoreRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: StoreStatus.APPROVED }),
      );
      expect(mockStoreEventsService.emitStoreApproved).toHaveBeenCalledWith(
        expect.anything(),
        'matti@nordicbakery.fi',
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STORE_APPROVED',
          resource: 'stores',
          resourceId: 'store-uuid',
        }),
      );
    });

    it('should reject approval if store is already approved', async () => {
      setupMockStore({ status: StoreStatus.APPROVED });

      await expect(service.approve('store-uuid')).rejects.toThrow(BadRequestException);
    });

    it('should reject approval if store is already active', async () => {
      setupMockStore({ status: StoreStatus.ACTIVE });

      await expect(service.approve('store-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('REJECT STORE', () => {
    it('should transition store to REJECTED and record rejection reason', async () => {
      setupMockStore({ status: StoreStatus.UNDER_REVIEW });

      const reason = 'Incomplete business registration documentation provided.';
      const updated = await service.reject('store-uuid', reason, 'admin-uuid');

      expect(updated.status).toBe(StoreStatus.REJECTED);
      expect(updated.rejectionReason).toBe(reason);
      expect(mockStoreRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: StoreStatus.REJECTED,
          rejectionReason: reason,
        }),
      );
      expect(mockStoreEventsService.emitStoreRejected).toHaveBeenCalledWith(
        expect.anything(),
        reason,
        'matti@nordicbakery.fi',
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STORE_REJECTED',
          resource: 'stores',
          metadata: expect.objectContaining({ reason }),
        }),
      );
    });

    it('should reject rejection if store is already rejected', async () => {
      setupMockStore({ status: StoreStatus.REJECTED });

      await expect(service.reject('store-uuid', 'Duplicate')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('ACTIVATE & REACTIVATE STORE', () => {
    it('should activate an APPROVED store and log STORE_ACTIVATED', async () => {
      setupMockStore({ status: StoreStatus.APPROVED });

      const updated = await service.activate('store-uuid', 'admin-uuid');

      expect(updated.status).toBe(StoreStatus.ACTIVE);
      expect(mockStoreEventsService.emitStoreActivated).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STORE_ACTIVATED' }),
      );
    });

    it('should reactivate a SUSPENDED store, clear suspension reason, and log STORE_REACTIVATED', async () => {
      setupMockStore({
        status: StoreStatus.SUSPENDED,
        suspensionReason: 'Old violation',
      });

      const updated = await service.activate('store-uuid', 'admin-uuid');

      expect(updated.status).toBe(StoreStatus.ACTIVE);
      expect(updated.suspensionReason).toBeNull();
      expect(mockStoreEventsService.emitStoreReactivated).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'STORE_REACTIVATED' }),
      );
    });

    it('should throw BadRequestException if activating store still UNDER_REVIEW', async () => {
      setupMockStore({ status: StoreStatus.UNDER_REVIEW });

      await expect(service.activate('store-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('SUSPEND STORE', () => {
    it('should suspend an ACTIVE store, record reason, and log STORE_SUSPENDED', async () => {
      setupMockStore({ status: StoreStatus.ACTIVE });

      const reason = 'Suspected fraudulent activity reported.';
      const updated = await service.suspend('store-uuid', reason, 'admin-uuid');

      expect(updated.status).toBe(StoreStatus.SUSPENDED);
      expect(updated.suspensionReason).toBe(reason);
      expect(mockStoreEventsService.emitStoreSuspended).toHaveBeenCalledWith(
        expect.anything(),
        reason,
        'matti@nordicbakery.fi',
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'STORE_SUSPENDED',
          metadata: expect.objectContaining({ reason }),
        }),
      );
    });

    it('should throw BadRequestException if store is already suspended', async () => {
      setupMockStore({ status: StoreStatus.SUSPENDED });

      await expect(service.suspend('store-uuid', 'Reason')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('FIND ONE', () => {
    it('should throw NotFoundException if store does not exist', async () => {
      const qbMock = {
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      mockStoreRepo.createQueryBuilder.mockReturnValue(qbMock);

      await expect(service.findOne('non-existent-uuid')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
