import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentsService } from './payments.service.js';
import { PaymentStatus } from './enums/payment-status.enum.js';
import { OrderStatus } from '../orders/enums/order-status.enum.js';

describe('PaymentsService (Stripe Payment Gateway & Orchestration)', () => {
  let service: PaymentsService;
  let paymentRepo: any;
  let orderRepo: any;
  let ordersService: any;
  let payoutsService: any;
  let invoicesService: any;
  let configService: any;

  beforeEach(() => {
    paymentRepo = {
      create: vi.fn((data) => ({ ...data, id: 'pay-uuid-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'pay-uuid-1' })),
      findOne: vi.fn(),
    };

    orderRepo = {
      findOne: vi.fn(),
    };

    ordersService = {
      markOrderAsPaid: vi.fn().mockImplementation((orderId) =>
        Promise.resolve({
          id: orderId,
          orderNumber: 'ORD-100',
          status: OrderStatus.PAID,
          totalAmount: 100,
          currency: 'USD',
          storeOrders: [{ id: 'so-1', storeId: 'store-1', totalAmount: 100 }],
        }),
      ),
    };

    payoutsService = {
      recordOrderEarnings: vi.fn().mockResolvedValue([]),
    };

    invoicesService = {
      generateOrderInvoice: vi.fn().mockResolvedValue({
        invoiceNumber: 'INV-202610-001',
        totalAmount: 100,
      }),
    };

    configService = {
      get: vi.fn((key: string, defaultVal?: any) => {
        if (key === 'STRIPE_SECRET_KEY') return 'sk_test_replace_with_your_stripe_secret_key'; // Test simulation mode
        if (key === 'STRIPE_CURRENCY') return 'USD';
        if (key === 'STRIPE_PUBLIC_KEY') return 'pk_test_sample';
        return defaultVal;
      }),
    };

    service = new PaymentsService(
      paymentRepo,
      orderRepo,
      ordersService,
      payoutsService,
      invoicesService,
      configService,
    );
  });

  describe('createPaymentIntent', () => {
    it('should create payment record and return clientSecret for pending order', async () => {
      const mockOrder = {
        id: 'ord-1',
        orderNumber: 'ORD-123',
        status: OrderStatus.PENDING,
        totalAmount: 75.5,
        currency: 'USD',
        isGuest: true,
        guestEmail: 'guest@buyer.com',
      };

      orderRepo.findOne.mockResolvedValue(mockOrder);
      paymentRepo.findOne.mockResolvedValue(null);

      const result = await service.createPaymentIntent('ord-1');

      expect(result.orderId).toBe('ord-1');
      expect(result.orderNumber).toBe('ORD-123');
      expect(result.amount).toBe(75.5);
      expect(result.currency).toBe('USD');
      expect(result.clientSecret).toBeDefined();
      expect(result.paymentIntentId).toBeDefined();
      expect(paymentRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order is already paid', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        status: OrderStatus.PAID,
      });

      await expect(service.createPaymentIntent('ord-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('finalizeSuccessfulPayment', () => {
    it('should mark order PAID, calculate 10% fee split in PayoutsService, and generate invoice', async () => {
      paymentRepo.findOne.mockResolvedValue({
        id: 'pay-1',
        orderId: 'ord-1',
        status: PaymentStatus.PENDING,
      });

      const result = await service.finalizeSuccessfulPayment('ord-1', 'pi_test_123', 'card');

      expect(result.success).toBe(true);

      // 1. Order marked as PAID
      expect(ordersService.markOrderAsPaid).toHaveBeenCalledWith('ord-1', 'STRIPE', 'pi_test_123');

      // 2. Earnings split with 10% platform cut & 14-day hold
      expect(payoutsService.recordOrderEarnings).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ord-1' }),
      );

      // 3. Tax invoice generated
      expect(invoicesService.generateOrderInvoice).toHaveBeenCalledWith('ord-1', 'pi_test_123');

      // 4. Payment record saved as SUCCEEDED
      expect(paymentRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: PaymentStatus.SUCCEEDED,
          stripePaymentIntentId: 'pi_test_123',
          paymentMethod: 'card',
        }),
      );
    });
  });
});
