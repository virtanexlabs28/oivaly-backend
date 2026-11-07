import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PayoutsService } from './payouts.service.js';
import { SellerTransactionStatus } from './enums/seller-transaction-status.enum.js';
import { PayoutStatus } from './enums/payout-status.enum.js';
import { PayoutMethod } from './enums/payout-method.enum.js';

describe('PayoutsService (10% Platform Cut, 14-Day Hold, Seller Sales & Payouts)', () => {
  let service: PayoutsService;
  let transactionRepo: any;
  let balanceRepo: any;
  let payoutRepo: any;
  let settingsRepo: any;
  let storeRepo: any;
  let orderItemRepo: any;
  let configService: any;
  let notificationsService: any;

  beforeEach(() => {
    transactionRepo = {
      create: vi.fn((data) => ({ ...data, id: 'tx-uuid-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'tx-uuid-1' })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    balanceRepo = {
      create: vi.fn((data) => ({ ...data, id: 'bal-uuid-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'bal-uuid-1' })),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    payoutRepo = {
      create: vi.fn((data) => ({ ...data, id: 'payout-uuid-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'payout-uuid-1' })),
      findOne: vi.fn(),
      find: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    settingsRepo = {
      create: vi.fn((data) => ({ ...data, id: 'settings-uuid-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'settings-uuid-1' })),
      findOne: vi.fn(),
    };

    storeRepo = {
      findOne: vi.fn(),
    };

    orderItemRepo = {
      createQueryBuilder: vi.fn(),
    };

    configService = {
      get: vi.fn((key: string, defaultVal?: any) => {
        if (key === 'PLATFORM_FEE_PERCENT') return 10;
        if (key === 'SELLER_PAYOUT_HOLD_DAYS') return 14;
        if (key === 'MINIMUM_PAYOUT_AMOUNT') return 50;
        return defaultVal;
      }),
    };

    notificationsService = {
      sendInvoiceEmail: vi.fn().mockResolvedValue(true),
    };

    const platformSettings: any = {
      getNumber: vi.fn((key: string, defaultVal?: number) => {
        if (key === 'PLATFORM_FEE_PERCENT') return 10;
        if (key === 'SELLER_PAYOUT_HOLD_DAYS') return 14;
        if (key === 'MINIMUM_PAYOUT_AMOUNT') return 50;
        return defaultVal ?? 0;
      }),
      getString: vi.fn(),
    };

    service = new PayoutsService(
      transactionRepo,
      balanceRepo,
      payoutRepo,
      settingsRepo,
      storeRepo,
      orderItemRepo,
      configService,
      notificationsService,
      platformSettings,
    );
  });

  describe('10% Platform Fee Cut and 14-Day Holding Window', () => {
    it('should split store order revenue into 10% platform fee and 90% net seller share', async () => {
      const mockOrder: any = {
        id: 'ord-123',
        orderNumber: 'ORD-202610-001',
        currency: 'USD',
        storeOrders: [
          {
            id: 'so-1',
            storeId: 'store-abc',
            storeOrderNumber: 'SO-202610-A1',
            totalAmount: 100.0, // $100 gross
          },
          {
            id: 'so-2',
            storeId: 'store-xyz',
            storeOrderNumber: 'SO-202610-B2',
            totalAmount: 250.0, // $250 gross
          },
        ],
      };

      transactionRepo.findOne.mockResolvedValue(null);
      balanceRepo.findOne.mockResolvedValue(null);

      const txs = await service.recordOrderEarnings(mockOrder);

      expect(txs).toHaveLength(2);

      // Store 1: $100 -> 10% ($10) fee, $90 net
      expect(txs[0].grossAmount).toBe(100.0);
      expect(txs[0].commissionRate).toBe(0.1);
      expect(txs[0].commissionAmount).toBe(10.0);
      expect(txs[0].netAmount).toBe(90.0);
      expect(txs[0].status).toBe(SellerTransactionStatus.PENDING_CLEARANCE);

      // Verify 14-day hold date
      const holdDurationDays = (txs[0].availableOn.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      expect(Math.round(holdDurationDays)).toBe(14);

      // Store 2: $250 -> 10% ($25) fee, $225 net
      expect(txs[1].grossAmount).toBe(250.0);
      expect(txs[1].commissionAmount).toBe(25.0);
      expect(txs[1].netAmount).toBe(225.0);
    });

    it('should update seller pending balance with the 90% net earnings', async () => {
      const mockOrder: any = {
        id: 'ord-123',
        orderNumber: 'ORD-202610-001',
        currency: 'USD',
        storeOrders: [
          {
            id: 'so-1',
            storeId: 'store-abc',
            storeOrderNumber: 'SO-202610-A1',
            totalAmount: 200.0, // $200 -> $180 net to seller
          },
        ],
      };

      balanceRepo.findOne.mockResolvedValue({
        storeId: 'store-abc',
        pendingBalance: 50.0,
        availableBalance: 0,
        paidBalance: 0,
      });

      await service.recordOrderEarnings(mockOrder);

      // Previous 50 + 180 = 230 pending
      expect(balanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          storeId: 'store-abc',
          pendingBalance: 230.0,
        }),
      );
    });
  });

  describe('14-Day Hold Clearance Engine', () => {
    it('should shift mature funds from pendingBalance to availableBalance after 14 days', async () => {
      const matureTx = {
        id: 'tx-mature',
        storeId: 'store-abc',
        netAmount: 180.0,
        status: SellerTransactionStatus.PENDING_CLEARANCE,
        availableOn: new Date(Date.now() - 1000 * 60), // Past
      };

      transactionRepo.find.mockResolvedValue([matureTx]);

      const mockBalance = {
        storeId: 'store-abc',
        pendingBalance: 180.0,
        availableBalance: 0,
        paidBalance: 0,
      };
      balanceRepo.findOne.mockResolvedValue(mockBalance);

      const result = await service.processClearance();

      expect(result.clearedCount).toBe(1);
      expect(result.totalClearedAmount).toBe(180.0);
      expect(matureTx.status).toBe(SellerTransactionStatus.AVAILABLE);

      // Pending balance reduced to 0, available increased to 180
      expect(mockBalance.pendingBalance).toBe(0);
      expect(mockBalance.availableBalance).toBe(180.0);
      expect(balanceRepo.save).toHaveBeenCalledWith(mockBalance);
    });
  });

  describe('Payout Disbursements', () => {
    it('should disburse payout when available balance meets minimum threshold', async () => {
      balanceRepo.findOne.mockResolvedValue({
        storeId: 'store-abc',
        pendingBalance: 100.0,
        availableBalance: 200.0,
        paidBalance: 50.0,
        currency: 'USD',
      });

      settingsRepo.findOne.mockResolvedValue({
        storeId: 'store-abc',
        payoutMethod: PayoutMethod.BANK_TRANSFER,
        bankAccountName: 'Acme Store Oy',
        bankAccountNumberMasked: '••••1234',
        minimumPayoutThreshold: 50.0,
      });

      transactionRepo.find.mockResolvedValue([
        { id: 'tx-1', status: SellerTransactionStatus.AVAILABLE },
      ]);

      const payout = await service.processStorePayout('store-abc');

      expect(payout.amount).toBe(200.0);
      expect(payout.status).toBe(PayoutStatus.COMPLETED);
      expect(payout.payoutNumber).toMatch(/^PAY-\d{8}-[A-Z0-9]+$/);

      // Verify balance update: available becomes 0, paid becomes 250
      expect(balanceRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          availableBalance: 0,
          paidBalance: 250.0,
        }),
      );
    });

    it('should throw BadRequestException if available balance is below minimum threshold', async () => {
      balanceRepo.findOne.mockResolvedValue({
        storeId: 'store-abc',
        availableBalance: 25.0,
      });

      settingsRepo.findOne.mockResolvedValue({
        storeId: 'store-abc',
        minimumPayoutThreshold: 50.0,
      });

      await expect(service.processStorePayout('store-abc')).rejects.toThrow(BadRequestException);
    });
  });

  describe('Tenant-Isolated Seller Sales Analytics', () => {
    it('should return sales summary with 10% fee breakdown and pending vs available balances', async () => {
      balanceRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        pendingBalance: 900.0,
        availableBalance: 450.0,
        paidBalance: 2000.0,
        currency: 'USD',
      });

      const qbMock: any = {
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        addSelect: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({
          totalOrdersCount: '15',
          totalGrossSales: '1500.00',
          totalCommissionPaid: '150.00',
          totalNetEarnings: '1350.00',
        }),
      };
      transactionRepo.createQueryBuilder.mockReturnValue(qbMock);

      settingsRepo.findOne.mockResolvedValue({
        storeId: 'store-1',
        payoutMethod: PayoutMethod.BANK_TRANSFER,
        minimumPayoutThreshold: 50,
      });

      const summary = await service.getStoreSalesSummary('store-1');

      expect(summary.financials.totalGrossSales).toBe(1500.0);
      expect(summary.financials.totalCommissionPaid).toBe(150.0);
      expect(summary.financials.commissionRatePercent).toBe(10);
      expect(summary.financials.totalNetEarnings).toBe(1350.0);
      expect(summary.balances.pendingBalance).toBe(900.0);
      expect(summary.balances.availableBalance).toBe(450.0);
      expect(summary.balances.paidBalance).toBe(2000.0);
    });
  });
});
