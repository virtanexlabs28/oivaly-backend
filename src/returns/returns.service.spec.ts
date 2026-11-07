import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { ReturnsService } from './returns.service.js';
import { ReturnRequestType } from './enums/return-request-type.enum.js';
import { ReturnRequestStatus } from './enums/return-request-status.enum.js';
import { OrderStatus } from '../orders/enums/order-status.enum.js';

describe('ReturnsService (14-Day Statutory Consumer Withdrawal & Complaints)', () => {
  let service: ReturnsService;
  let returnRepo: any;
  let orderRepo: any;
  let orderItemRepo: any;
  let productRepo: any;
  let auditService: any;
  let notificationsService: any;

  beforeEach(() => {
    returnRepo = {
      create: vi.fn((data) => ({ ...data, id: 'ret-123' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'ret-123' })),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    orderRepo = {
      findOne: vi.fn(),
    };

    orderItemRepo = {
      findOne: vi.fn(),
    };

    productRepo = {
      findOne: vi.fn(),
    };

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    notificationsService = {
      sendWithdrawalReceiptEmail: vi.fn().mockResolvedValue(true),
      sendReturnStatusEmail: vi.fn().mockResolvedValue(true),
    };

    service = new ReturnsService(
      returnRepo,
      orderRepo,
      orderItemRepo,
      productRepo,
      auditService,
      notificationsService,
    );
  });

  describe('14-DAY STATUTORY CONSUMER WITHDRAWAL RULES', () => {
    it('should successfully submit 14-day consumer withdrawal within legal 14-day window and dispatch durable-medium receipt', async () => {
      const recentOrderDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago

      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-123',
        customerId: 'customer-1',
        status: OrderStatus.DELIVERED,
        createdAt: recentOrderDate,
        customer: { email: 'customer@example.fi' },
        storeOrders: [
          {
            id: 'so-1',
            storeId: 'store-1',
            items: [
              {
                id: 'oi-1',
                productId: 'prod-1',
                storeId: 'store-1',
                storeOrderId: 'so-1',
                productNameSnapshot: 'Finnish Wool Scarf',
                quantity: 2,
              },
            ],
          },
        ],
      });

      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        name: 'Finnish Wool Scarf',
        isReturnEligible: true,
      });

      const result = await service.create('customer-1', {
        orderId: 'order-1',
        type: ReturnRequestType.WITHDRAWAL,
        reason: 'Color does not match preferences',
        items: [{ orderItemId: 'oi-1', quantity: 1 }],
      });

      expect(result).toBeDefined();
      expect(result.type).toBe(ReturnRequestType.WITHDRAWAL);
      expect(result.status).toBe(ReturnRequestStatus.PENDING);
      expect(notificationsService.sendWithdrawalReceiptEmail).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'RETURN_REQUEST_CREATED' }),
      );
    });

    it('should REJECT consumer withdrawal if the 14-day statutory window has expired', async () => {
      const oldOrderDate = new Date(Date.now() - 16 * 24 * 60 * 60 * 1000); // 16 days ago (> 14 days)

      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.DELIVERED,
        createdAt: oldOrderDate,
        storeOrders: [
          {
            items: [
              {
                id: 'oi-1',
                productId: 'prod-1',
                storeId: 'store-1',
                quantity: 1,
              },
            ],
          },
        ],
      });

      await expect(
        service.create('customer-1', {
          orderId: 'order-1',
          type: ReturnRequestType.WITHDRAWAL,
          reason: 'Changed mind after 16 days',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should REJECT withdrawal if product is marked isReturnEligible: false (hygiene/custom exemption)', async () => {
      const recentOrderDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);

      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-1',
        status: OrderStatus.DELIVERED,
        createdAt: recentOrderDate,
        storeOrders: [
          {
            items: [
              {
                id: 'oi-1',
                productId: 'prod-hygiene',
                storeId: 'store-1',
                productNameSnapshot: 'Underwear / Piercing',
                quantity: 1,
              },
            ],
          },
        ],
      });

      productRepo.findOne.mockResolvedValue({
        id: 'prod-hygiene',
        name: 'Underwear / Piercing',
        isReturnEligible: false,
      });

      await expect(
        service.create('customer-1', {
          orderId: 'order-1',
          type: ReturnRequestType.WITHDRAWAL,
          reason: 'Does not fit',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should block customer from submitting returns for other customers orders', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        customerId: 'customer-A',
        status: OrderStatus.DELIVERED,
      });

      await expect(
        service.create('customer-B', {
          orderId: 'order-1',
          type: ReturnRequestType.WITHDRAWAL,
          reason: 'Test',
          items: [{ orderItemId: 'oi-1', quantity: 1 }],
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
