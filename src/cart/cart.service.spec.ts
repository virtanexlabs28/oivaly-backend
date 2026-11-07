import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service.js';
import { ProductStatus } from '../products/enums/product-status.enum.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';

describe('CartService', () => {
  let service: CartService;
  let cartRepo: any;
  let cartItemRepo: any;
  let productRepo: any;
  let variantRepo: any;
  let storeRepo: any;
  let reservationRepo: any;
  let auditService: any;

  const mockCustomerId = 'cust-123';
  const mockCart = { id: 'cart-123', customerId: mockCustomerId };

  beforeEach(() => {
    cartRepo = {
      findOne: vi.fn(),
      create: vi.fn((dto: any) => ({ id: 'cart-123', ...dto })),
      save: vi.fn((cart: any) => Promise.resolve(cart)),
    };

    cartItemRepo = {
      find: vi.fn().mockResolvedValue([]),
      findOne: vi.fn(),
      create: vi.fn((dto: any) => ({ id: 'item-123', ...dto })),
      save: vi.fn((item: any) => Promise.resolve(item)),
      remove: vi.fn().mockResolvedValue({}),
      delete: vi.fn().mockResolvedValue({ affected: 1 }),
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

    reservationRepo = {
      createQueryBuilder: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        getRawOne: vi.fn().mockResolvedValue({ totalReserved: null }),
      })),
    };

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new CartService(
      cartRepo,
      cartItemRepo,
      productRepo,
      variantRepo,
      storeRepo,
      reservationRepo,
      auditService,
    );
  });

  describe('Cart Security & Validation (Section 19)', () => {
    it('should throw BadRequestException if quantity < 1', async () => {
      await expect(
        service.addItem(mockCustomerId, {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 0,
        }),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.addItem(mockCustomerId, {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: -3,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if product does not exist', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      productRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addItem(mockCustomerId, {
          productId: 'non-existent',
          variantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if product is not published', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.DRAFT,
        store: { id: 'store-1', status: StoreStatus.ACTIVE },
      });

      await expect(
        service.addItem(mockCustomerId, {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if store is not active', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PUBLISHED,
        store: { id: 'store-1', status: StoreStatus.SUSPENDED },
      });

      await expect(
        service.addItem(mockCustomerId, {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if variant does not belong to the product', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        status: ProductStatus.PUBLISHED,
        store: { id: 'store-1', status: StoreStatus.ACTIVE },
      });
      variantRepo.findOne.mockResolvedValue({
        id: 'var-1',
        productId: 'different-prod',
        isActive: true,
        stockQuantity: 10,
      });

      await expect(
        service.addItem(mockCustomerId, {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 1,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if requested quantity exceeds available stock', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        name: 'Item A',
        status: ProductStatus.PUBLISHED,
        storeId: 'store-1',
        store: { id: 'store-1', status: StoreStatus.ACTIVE },
      });
      variantRepo.findOne.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        isActive: true,
        stockQuantity: 5,
      });
      cartItemRepo.findOne.mockResolvedValue(null);

      // Attempt to add 10 items when only 5 in stock
      await expect(
        service.addItem(mockCustomerId, {
          productId: 'prod-1',
          variantId: 'var-1',
          quantity: 10,
        }),
      ).rejects.toThrow(/Insufficient stock/);
    });

    it('should successfully add valid item to cart and audit log', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      productRepo.findOne.mockResolvedValue({
        id: 'prod-1',
        name: 'Item A',
        price: 50,
        vatRate: 20,
        vatIncluded: false,
        status: ProductStatus.PUBLISHED,
        storeId: 'store-1',
        store: { id: 'store-1', name: 'Store A', status: StoreStatus.ACTIVE },
      });
      variantRepo.findOne.mockResolvedValue({
        id: 'var-1',
        productId: 'prod-1',
        isActive: true,
        stockQuantity: 10,
        sku: 'SKU-001',
        price: 45,
      });
      cartItemRepo.findOne.mockResolvedValue(null);

      const result = await service.addItem(mockCustomerId, {
        productId: 'prod-1',
        variantId: 'var-1',
        quantity: 2,
      });

      expect(cartItemRepo.save).toHaveBeenCalled();
      expect(auditService.log).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('Multi-Vendor Cart Viewing', () => {
    it('should group cart items by store and calculate totals properly', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      variantRepo.findOne.mockImplementation(({ where }: { where: { id: string } }) => {
        return Promise.resolve({
          id: where.id,
          isActive: true,
          stockQuantity: 20,
        });
      });

      cartItemRepo.find.mockResolvedValue([
        {
          id: 'item-1',
          productId: 'p1',
          variantId: 'v1',
          storeId: 'store-A',
          quantity: 2,
          product: { name: 'Product A1', price: 10, vatRate: 0, vatIncluded: false, status: ProductStatus.PUBLISHED },
          variant: { id: 'v1', productId: 'p1', price: 10, isActive: true, stockQuantity: 20 },
          store: { id: 'store-A', name: 'Store Alpha', status: StoreStatus.ACTIVE },
        },
        {
          id: 'item-2',
          productId: 'p2',
          variantId: 'v2',
          storeId: 'store-B',
          quantity: 1,
          product: { name: 'Product B1', price: 25, vatRate: 0, vatIncluded: false, status: ProductStatus.PUBLISHED },
          variant: { id: 'v2', productId: 'p2', price: 25, isActive: true, stockQuantity: 20 },
          store: { id: 'store-B', name: 'Store Beta', status: StoreStatus.ACTIVE },
        },
      ]);

      const cart = await service.getCart(mockCustomerId);

      expect(cart.stores).toHaveLength(2);
      expect(cart.totalItems).toBe(3);
      expect(cart.subtotal).toBe(45); // (10 * 2) + (25 * 1)
      expect(cart.stores.find((s) => s.storeId === 'store-A')?.storeSubtotal).toBe(20);
      expect(cart.stores.find((s) => s.storeId === 'store-B')?.storeSubtotal).toBe(25);
    });
  });

  describe('Update Cart Item', () => {
    it('should throw BadRequestException if quantity < 1', async () => {
      await expect(
        service.updateItem(mockCustomerId, 'item-1', { quantity: 0 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if item does not exist in cart', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      cartItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(mockCustomerId, 'non-existent-item', { quantity: 2 }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if update quantity exceeds available stock', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      cartItemRepo.findOne.mockResolvedValue({
        id: 'item-1',
        cartId: mockCart.id,
        variantId: 'var-1',
        quantity: 1,
      });
      variantRepo.findOne.mockResolvedValue({
        id: 'var-1',
        stockQuantity: 3,
        isActive: true,
      });

      await expect(
        service.updateItem(mockCustomerId, 'item-1', { quantity: 10 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should update item quantity successfully', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      const mockItem = {
        id: 'item-1',
        cartId: mockCart.id,
        variantId: 'var-1',
        quantity: 1,
      };
      cartItemRepo.findOne.mockResolvedValue(mockItem);
      variantRepo.findOne.mockResolvedValue({
        id: 'var-1',
        stockQuantity: 10,
        isActive: true,
      });

      const updatedCart = await service.updateItem(mockCustomerId, 'item-1', { quantity: 3 });
      expect(cartItemRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ quantity: 3 }),
      );
      expect(updatedCart).toBeDefined();
    });
  });

  describe('Remove Cart Item', () => {
    it('should throw NotFoundException if item not found in cart', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      cartItemRepo.findOne.mockResolvedValue(null);

      await expect(
        service.removeItem(mockCustomerId, 'missing-item'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should remove item successfully', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      const mockItem = {
        id: 'item-1',
        cartId: mockCart.id,
      };
      cartItemRepo.findOne.mockResolvedValue(mockItem);

      const cart = await service.removeItem(mockCustomerId, 'item-1');
      expect(cartItemRepo.remove).toHaveBeenCalledWith(mockItem);
      expect(cart).toBeDefined();
    });
  });

  describe('Clear Cart', () => {
    it('should clear cart and log audit event', async () => {
      cartRepo.findOne.mockResolvedValue(mockCart);
      const res = await service.clearCart(mockCustomerId);
      expect(cartItemRepo.delete).toHaveBeenCalledWith({ cartId: mockCart.id });
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'CART_CLEARED' }),
      );
      expect(res.message).toContain('cleared');
    });
  });
});
