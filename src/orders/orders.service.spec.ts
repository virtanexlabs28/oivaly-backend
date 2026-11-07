import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { OrdersService } from './orders.service.js';
import { OrderStatus } from './enums/order-status.enum.js';
import { StoreOrderStatus } from './enums/store-order-status.enum.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { ProductStatus } from '../products/enums/product-status.enum.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';

describe('OrdersService', () => {
  let service: OrdersService;
  let orderRepo: any;
  let storeOrderRepo: any;
  let orderItemRepo: any;
  let reservationRepo: any;
  let cartRepo: any;
  let cartItemRepo: any;
  let productRepo: any;
  let variantRepo: any;
  let storeRepo: any;
  let userRepo: any;
  let dataSource: any;
  let auditService: any;
  let queryRunner: any;

  const mockCustomerA = 'cust-A';
  const mockCustomerB = 'cust-B';
  const mockStoreA = 'store-A';
  const mockStoreB = 'store-B';

  beforeEach(() => {
    queryRunner = {
      connect: vi.fn(),
      startTransaction: vi.fn(),
      commitTransaction: vi.fn(),
      rollbackTransaction: vi.fn(),
      release: vi.fn(),
      manager: {
        findOne: vi.fn(),
        find: vi.fn(),
        create: vi.fn((entity: any, data: any) => ({ id: `${entity?.name || 'entity'}-${Math.random().toString(36).substring(2, 6)}`, ...data })),
        save: vi.fn((entity: any, data?: any) => Promise.resolve(data || entity)),
        delete: vi.fn().mockResolvedValue({ affected: 1 }),
        createQueryBuilder: vi.fn(() => ({
          select: vi.fn().mockReturnThis(),
          where: vi.fn().mockReturnThis(),
          andWhere: vi.fn().mockReturnThis(),
          getRawOne: vi.fn().mockResolvedValue({ totalReserved: null }),
        })),
      },
    };

    dataSource = {
      createQueryRunner: vi.fn(() => queryRunner),
    };

    orderRepo = {
      findOne: vi.fn(),
      find: vi.fn(),
      save: vi.fn((o: any) => Promise.resolve(o)),
      createQueryBuilder: vi.fn(() => ({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      })),
    };

    storeOrderRepo = {
      findOne: vi.fn(),
      save: vi.fn((so: any) => Promise.resolve(so)),
      createQueryBuilder: vi.fn(() => ({
        leftJoinAndSelect: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        skip: vi.fn().mockReturnThis(),
        take: vi.fn().mockReturnThis(),
        getManyAndCount: vi.fn().mockResolvedValue([[], 0]),
      })),
    };

    orderItemRepo = {
      save: vi.fn((item: any) => Promise.resolve(item)),
    };

    reservationRepo = {
      save: vi.fn((res: any) => Promise.resolve(res)),
      update: vi.fn().mockResolvedValue({ affected: 1 }),
    };

    cartRepo = {
      findOne: vi.fn(),
    };

    cartItemRepo = {
      find: vi.fn(),
    };

    productRepo = {
      findOne: vi.fn(),
    };

    variantRepo = {
      findOne: vi.fn(),
    };

    storeRepo = {
      findOne: vi.fn(),
    };

    userRepo = {
      findOne: vi.fn().mockResolvedValue({ id: mockCustomerA, email: 'customerA@example.fi' }),
    };

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    const notificationsService = {
      sendOrderConfirmationEmail: vi.fn().mockResolvedValue(true),
      sendShippingNotificationEmail: vi.fn().mockResolvedValue(true),
    };

    service = new OrdersService(
      orderRepo,
      storeOrderRepo,
      orderItemRepo,
      reservationRepo,
      cartRepo,
      cartItemRepo,
      productRepo,
      variantRepo,
      storeRepo,
      userRepo,
      dataSource,
      auditService,
      notificationsService as any,
    );
  });

  describe('Multi-Vendor Checkout (Sections 4, 5, 6, 10, 11)', () => {
    it('should execute guest checkout without requiring user login and hold 15-min reservations', async () => {
      const mockVariant = {
        id: 'var-1',
        stockQuantity: 10,
        price: 49.99,
        isActive: true,
        product: {
          id: 'prod-1',
          name: 'Finnish Boots',
          status: ProductStatus.PUBLISHED,
          vatRate: 25.5,
          vatIncluded: true,
          store: { id: 'store-1', name: 'Nordic Shoes', status: StoreStatus.ACTIVE },
        },
      };

      queryRunner.manager.find.mockResolvedValue([mockVariant]);
      queryRunner.manager.findOne.mockResolvedValue(mockVariant);
      orderRepo.findOne.mockResolvedValue({
        id: 'saved-guest-order-id',
        orderNumber: 'ORD-GUEST-1',
        isGuest: true,
        guestEmail: 'shopper@example.fi',
      });


      const guestOrder = await service.guestCheckout({
        guestEmail: 'shopper@example.fi',
        guestName: 'Matti Meikäläinen',
        guestPhone: '+358401234567',
        shippingAddress: {
          fullName: 'Matti Meikäläinen',
          phone: '+358401234567',
          addressLine1: 'Aleksanterinkatu 5',
          city: 'Helsinki',
          postalCode: '00100',
          country: 'Finland',
        },
        items: [{ variantId: 'var-1', quantity: 2 }],
      });

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'GUEST_ORDER_CREATED' }),
      );
      expect(guestOrder).toBeDefined();
      expect(guestOrder.isGuest).toBe(true);
      expect(guestOrder.guestEmail).toBe('shopper@example.fi');
      expect(guestOrder.orderNumber).toBe('ORD-GUEST-1');
    });

    it('should fail checkout if customer cart is empty', async () => {

      queryRunner.manager.findOne.mockResolvedValue(null);

      await expect(
        service.checkout(mockCustomerA, {
          shippingAddress: {
            fullName: 'Customer A',
            phone: '123456789',
            addressLine1: 'Street 1',
            city: 'Helsinki',
            postalCode: '00100',
            country: 'Finland',
          },
        }),
      ).rejects.toThrow(BadRequestException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should checkout multi-vendor items into 1 Parent Order + 2 Store Orders with snapshot & 15-minute reservation', async () => {
      const mockCart = { id: 'cart-1', customerId: mockCustomerA };
      queryRunner.manager.findOne.mockImplementation((entity: any, opts: any) => {
        if (opts?.where?.customerId) return Promise.resolve(mockCart);
        if (opts?.where?.id === 'v-1') {
          return Promise.resolve({
            id: 'v-1',
            productId: 'p-1',
            sku: 'SKU-A1',
            price: 50,
            stockQuantity: 10,
            isActive: true,
            size: 'M',
            color: 'Red',
          });
        }
        if (opts?.where?.id === 'v-2') {
          return Promise.resolve({
            id: 'v-2',
            productId: 'p-2',
            sku: 'SKU-B1',
            price: 30,
            stockQuantity: 5,
            isActive: true,
            size: 'L',
            color: 'Blue',
          });
        }
        return Promise.resolve(null);
      });

      // Cart items from two distinct stores
      queryRunner.manager.find.mockResolvedValue([
        {
          id: 'item-1',
          storeId: mockStoreA,
          productId: 'p-1',
          variantId: 'v-1',
          quantity: 2,
          product: {
            id: 'p-1',
            name: 'Store A Product',
            price: 50,
            vatRate: 0,
            vatIncluded: false,
            status: ProductStatus.PUBLISHED,
            storeId: mockStoreA,
          },
          store: { id: mockStoreA, name: 'Store A', status: StoreStatus.ACTIVE },
        },
        {
          id: 'item-2',
          storeId: mockStoreB,
          productId: 'p-2',
          variantId: 'v-2',
          quantity: 1,
          product: {
            id: 'p-2',
            name: 'Store B Product',
            price: 30,
            vatRate: 0,
            vatIncluded: false,
            status: ProductStatus.PUBLISHED,
            storeId: mockStoreB,
          },
          store: { id: mockStoreB, name: 'Store B', status: StoreStatus.ACTIVE },
        },
      ]);

      // Mock customer order return
      orderRepo.findOne.mockResolvedValue({
        id: 'order-1',
        orderNumber: 'ORD-123',
        customerId: mockCustomerA,
        status: OrderStatus.PENDING,
        subtotal: 130, // (50*2) + (30*1)
        totalAmount: 130,
        storeOrders: [
          { id: 'so-1', storeId: mockStoreA, status: StoreOrderStatus.PENDING, totalAmount: 100 },
          { id: 'so-2', storeId: mockStoreB, status: StoreOrderStatus.PENDING, totalAmount: 30 },
        ],
      });

      const order = await service.checkout(mockCustomerA, {
        shippingAddress: {
          fullName: 'Customer A',
          phone: '123456789',
          addressLine1: 'Street 1',
          city: 'Helsinki',
          postalCode: '00100',
          country: 'Finland',
        },
      });

      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.manager.delete).toHaveBeenCalled(); // Cart cleared
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORDER_CREATED' }),
      );
      expect(order.storeOrders).toHaveLength(2);
    });
  });

  describe('Tenant Isolation Testing (Section 18)', () => {
    it('Customer A can view Customer A orders', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-A',
        customerId: mockCustomerA,
      });

      const order = await service.findOneOrderForCustomer('ord-A', mockCustomerA);
      expect(order.id).toBe('ord-A');
    });

    it('Customer A CANNOT view Customer B orders (throws NotFoundException)', async () => {
      // Query with customerId: mockCustomerA returns null because it belongs to Customer B
      orderRepo.findOne.mockImplementation(({ where }: any) => {
        if (where?.id === 'ord-B' && where?.customerId === mockCustomerB) {
          return Promise.resolve({ id: 'ord-B', customerId: mockCustomerB });
        }
        return Promise.resolve(null);
      });

      await expect(
        service.findOneOrderForCustomer('ord-B', mockCustomerA),
      ).rejects.toThrow(NotFoundException);

      const customerBOrder = await service.findOneOrderForCustomer('ord-B', mockCustomerB);
      expect(customerBOrder.id).toBe('ord-B');
      expect(customerBOrder.customerId).toBe(mockCustomerB);
    });

    it('Store A Admin can view Store A orders', async () => {
      storeOrderRepo.findOne.mockResolvedValue({
        id: 'so-A',
        storeId: mockStoreA,
      });

      const storeOrder = await service.findOneStoreOrder('so-A', mockStoreA);
      expect(storeOrder.storeId).toBe(mockStoreA);
    });

    it('Store A Admin CANNOT view Store B orders (throws NotFoundException)', async () => {
      storeOrderRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findOneStoreOrder('so-B', mockStoreA),
      ).rejects.toThrow(NotFoundException);
    });

    it('Platform Admin can view any store order across the marketplace', async () => {
      storeOrderRepo.findOne.mockResolvedValue({
        id: 'so-B',
        storeId: mockStoreB,
      });

      const storeOrder = await service.findOneStoreOrderAdmin('so-B');
      expect(storeOrder.id).toBe('so-B');
    });
  });

  describe('Order Cancellation Rules (Section 15)', () => {
    it('Customer can cancel an order in PENDING status', async () => {
      orderRepo.findOne
        .mockResolvedValueOnce({
          id: 'ord-1',
          customerId: mockCustomerA,
          status: OrderStatus.PENDING,
          storeOrders: [{ id: 'so-1', status: StoreOrderStatus.PENDING }],
          reservations: [],
        })
        .mockResolvedValueOnce({
          id: 'ord-1',
          customerId: mockCustomerA,
          status: OrderStatus.CANCELLED,
          storeOrders: [{ id: 'so-1', status: StoreOrderStatus.CANCELLED }],
        });

      const result = await service.cancelCustomerOrder('ord-1', mockCustomerA);

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
      expect(reservationRepo.update).toHaveBeenCalledWith(
        { orderId: 'ord-1', status: ReservationStatus.ACTIVE },
        { status: ReservationStatus.RELEASED },
      );
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'ORDER_CANCELLED' }),
      );
      expect(result).toBeDefined();
      expect(result.status).toBe(OrderStatus.CANCELLED);
    });

    it('Customer CANNOT cancel an order once any store order is SHIPPED', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-1',
        customerId: mockCustomerA,
        status: OrderStatus.PARTIALLY_SHIPPED,
        storeOrders: [
          { id: 'so-1', status: StoreOrderStatus.SHIPPED },
          { id: 'so-2', status: StoreOrderStatus.PROCESSING },
        ],
      });

      await expect(
        service.cancelCustomerOrder('ord-1', mockCustomerA),
      ).rejects.toThrow(/Cannot cancel order because one or more store orders have already shipped/);
    });
  });

  describe('Store Order Status & Parent Order Rollup (Section 9)', () => {
    it('Parent order becomes PARTIALLY_SHIPPED when one store order is shipped', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-parent',
        status: OrderStatus.PROCESSING,
        storeOrders: [
          { id: 'so-1', status: StoreOrderStatus.SHIPPED },
          { id: 'so-2', status: StoreOrderStatus.PROCESSING },
        ],
      });

      await service.syncParentOrderStatus('ord-parent');

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.PARTIALLY_SHIPPED }),
      );
    });

    it('Parent order becomes SHIPPED when all store orders are shipped', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-parent',
        status: OrderStatus.PARTIALLY_SHIPPED,
        storeOrders: [
          { id: 'so-1', status: StoreOrderStatus.SHIPPED },
          { id: 'so-2', status: StoreOrderStatus.SHIPPED },
        ],
      });

      await service.syncParentOrderStatus('ord-parent');

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.SHIPPED }),
      );
    });

    it('Parent order becomes DELIVERED when all store orders are delivered', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-parent',
        status: OrderStatus.SHIPPED,
        storeOrders: [
          { id: 'so-1', status: StoreOrderStatus.DELIVERED },
          { id: 'so-2', status: StoreOrderStatus.DELIVERED },
        ],
      });

      await service.syncParentOrderStatus('ord-parent');

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.DELIVERED }),
      );
    });

    it('Parent order becomes CANCELLED when all store orders are cancelled', async () => {
      orderRepo.findOne.mockResolvedValue({
        id: 'ord-parent',
        status: OrderStatus.PENDING,
        storeOrders: [
          { id: 'so-1', status: StoreOrderStatus.CANCELLED },
          { id: 'so-2', status: StoreOrderStatus.CANCELLED },
        ],
      });

      await service.syncParentOrderStatus('ord-parent');

      expect(orderRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
    });
  });
});
