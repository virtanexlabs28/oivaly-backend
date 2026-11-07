import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvoicesService } from './invoices.service.js';
import { InvoiceStatus } from './enums/invoice-status.enum.js';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let invoiceRepo: any;
  let orderRepo: any;
  let notificationsService: any;

  beforeEach(() => {
    invoiceRepo = {
      create: vi.fn((data) => ({ ...data, id: 'inv-uuid-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'inv-uuid-1' })),
      findOne: vi.fn(),
      createQueryBuilder: vi.fn(),
    };

    orderRepo = {
      findOne: vi.fn(),
    };

    notificationsService = {
      sendInvoiceEmail: vi.fn().mockResolvedValue(true),
    };

    service = new InvoicesService(invoiceRepo, orderRepo, notificationsService);
  });

  describe('generateOrderInvoice', () => {
    it('should generate official tax invoice with line items snapshot and dispatch email', async () => {
      invoiceRepo.findOne.mockResolvedValue(null);

      const mockOrder: any = {
        id: 'ord-123',
        orderNumber: 'ORD-202610-XYZ',
        customerId: 'cust-1',
        isGuest: false,
        subtotal: 100,
        taxAmount: 24,
        shippingAmount: 10,
        totalAmount: 134,
        currency: 'EUR',
        customer: { email: 'customer@example.com', name: 'Matti Meikäläinen' },
        storeOrders: [
          {
            storeId: 'store-1',
            store: { name: 'Helsinki Tech Oy' },
            items: [
              {
                productId: 'prod-1',
                productNameSnapshot: 'Wireless Mouse',
                variantId: 'var-1',
                skuSnapshot: 'WM-001',
                quantity: 2,
                unitPrice: 50,
                total: 100,
              },
            ],
          },
        ],
      };

      orderRepo.findOne.mockResolvedValue(mockOrder);

      const invoice = await service.generateOrderInvoice('ord-123', 'pi_stripe_123');

      expect(invoice.invoiceNumber).toMatch(/^INV-\d{8}-[A-Z0-9]+$/);
      expect(invoice.totalAmount).toBe(134);
      expect(invoice.currency).toBe('EUR');
      expect(invoice.status).toBe(InvoiceStatus.PAID);
      expect(invoice.itemsSnapshot).toHaveLength(1);
      expect(invoice.itemsSnapshot[0].productTitle).toBe('Wireless Mouse');
      expect(invoice.itemsSnapshot[0].storeName).toBe('Helsinki Tech Oy');

      // Verify email notification
      expect(notificationsService.sendInvoiceEmail).toHaveBeenCalledWith(
        'customer@example.com',
        invoice.invoiceNumber,
        'ORD-202610-XYZ',
        134,
        'EUR',
      );
    });
  });

  describe('HTML Invoice Rendering', () => {
    it('should render styled HTML invoice with breakdown', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-1',
        invoiceNumber: 'INV-20261006-A1B2C',
        orderId: 'ord-1',
        order: { orderNumber: 'ORD-100' },
        customerName: 'Test Buyer',
        customerEmail: 'buyer@test.fi',
        currency: 'USD',
        subtotal: 100,
        taxAmount: 10,
        shippingAmount: 5,
        totalAmount: 115,
        issuedAt: new Date(),
        itemsSnapshot: [
          {
            productTitle: 'Pro Headset',
            storeName: 'AudioStore',
            quantity: 1,
            unitPrice: 100,
            totalPrice: 100,
          },
        ],
      });

      const html = await service.generateInvoiceHtml('inv-1');

      expect(html).toContain('TAX INVOICE');
      expect(html).toContain('INV-20261006-A1B2C');
      expect(html).toContain('Pro Headset');
      expect(html).toContain('AudioStore');
      expect(html).toContain('115.00');
    });
  });

  describe('Store-Isolated Invoices', () => {
    it('should filter invoice line items strictly to the requested store', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-multi',
        itemsSnapshot: [
          { storeId: 'my-store', productTitle: 'My Product', totalPrice: 80 },
          { storeId: 'other-store', productTitle: 'Other Product', totalPrice: 50 },
        ],
      });

      const storeInvoice = await service.findStoreInvoiceById('inv-multi', 'my-store');

      expect(storeInvoice.itemsSnapshot).toHaveLength(1);
      expect(storeInvoice.itemsSnapshot[0].productTitle).toBe('My Product');
      expect(storeInvoice.totalAmount).toBe(80);
    });

    it('should throw ForbiddenException if store has no items in the invoice', async () => {
      invoiceRepo.findOne.mockResolvedValue({
        id: 'inv-other',
        itemsSnapshot: [
          { storeId: 'foreign-store', productTitle: 'Foreign Product', totalPrice: 50 },
        ],
      });

      await expect(service.findStoreInvoiceById('inv-other', 'my-store')).rejects.toThrow(ForbiddenException);
    });
  });
});
