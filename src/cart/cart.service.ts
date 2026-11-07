import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from './entities/cart.entity.js';
import { CartItem } from './entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { InventoryReservation } from '../orders/entities/inventory-reservation.entity.js';
import { ReservationStatus } from '../orders/enums/reservation-status.enum.js';
import { ProductStatus } from '../products/enums/product-status.enum.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

export interface CartItemDetail {
  id: string;
  productId: string;
  productName: string;
  variantId: string | null;
  variantDescription: string | null;
  sku: string | null;
  storeId: string;
  storeName: string;
  unitPrice: number;
  vatRate: number;
  vatIncluded: boolean;
  quantity: number;
  subtotal: number;
  taxAmount: number;
  total: number;
  availableStock: number;
  isValid: boolean;
  validationError?: string;
}

export interface StoreCartGroup {
  storeId: string;
  storeName: string;
  storeSubtotal: number;
  storeTax: number;
  storeTotal: number;
  items: CartItemDetail[];
}

export interface CartSummaryResponse {
  id: string;
  customerId: string;
  totalItems: number;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  stores: StoreCartGroup[];
  hasInvalidItems: boolean;
}

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private readonly cartRepo: Repository<Cart>,
    @InjectRepository(CartItem)
    private readonly cartItemRepo: Repository<CartItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(ProductVariant)
    private readonly variantRepo: Repository<ProductVariant>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(InventoryReservation)
    private readonly reservationRepo: Repository<InventoryReservation>,
    private readonly auditService: AuditService,
  ) {}

  /**
   * Find or create the active cart for a customer.
   */
  async getOrCreateCart(customerId: string): Promise<Cart> {
    let cart = await this.cartRepo.findOne({
      where: { customerId },
      relations: { items: true },
    });

    if (!cart) {
      cart = this.cartRepo.create({ customerId });
      cart = await this.cartRepo.save(cart);

      await this.auditService.log({
        actorUserId: customerId,
        action: AuditAction.CART_CREATED,
        resource: 'cart',
        resourceId: cart.id,
        metadata: { customerId },
      });
    }

    return cart;
  }

  /**
   * Calculate effective available stock considering active reservations.
   */
  async getEffectiveAvailableStock(variantId: string): Promise<number> {
    const variant = await this.variantRepo.findOne({ where: { id: variantId } });
    if (!variant || !variant.isActive) return 0;

    const activeReservations = await this.reservationRepo
      .createQueryBuilder('ir')
      .select('SUM(ir.quantity)', 'totalReserved')
      .where('ir.variantId = :variantId', { variantId })
      .andWhere('ir.status = :status', { status: ReservationStatus.ACTIVE })
      .andWhere('ir.expiresAt > :now', { now: new Date() })
      .getRawOne<{ totalReserved: string | null }>();

    const reservedCount = activeReservations?.totalReserved
      ? parseInt(activeReservations.totalReserved, 10)
      : 0;

    return Math.max(0, variant.stockQuantity - reservedCount);
  }

  /**
   * Get full cart details with real-time authoritative validation, prices, and store groupings.
   */
  async getCart(customerId: string): Promise<CartSummaryResponse> {
    const cart = await this.getOrCreateCart(customerId);

    const rawItems = await this.cartItemRepo.find({
      where: { cartId: cart.id },
      relations: {
        product: { store: true },
        variant: true,
        store: true,
      },
      order: { createdAt: 'ASC' },
    });

    const itemsByStoreMap = new Map<string, StoreCartGroup>();
    let overallTotalItems = 0;
    let overallSubtotal = 0;
    let overallTax = 0;
    let hasInvalidItems = false;

    for (const item of rawItems) {
      const product = item.product;
      const variant = item.variant;
      const store = item.store;

      let isValid = true;
      let validationError: string | undefined;

      if (!product) {
        isValid = false;
        validationError = 'Product no longer exists';
      } else if (product.status !== ProductStatus.PUBLISHED) {
        isValid = false;
        validationError = `Product is ${product.status.toLowerCase()} and not available for purchase`;
      } else if (!store || store.status !== StoreStatus.ACTIVE) {
        isValid = false;
        validationError = 'Store is currently inactive';
      } else if (!variant) {
        isValid = false;
        validationError = 'Product variant is missing or invalid';
      } else if (!variant.isActive) {
        isValid = false;
        validationError = 'Selected product variant is inactive';
      } else if (variant.productId !== product.id) {
        isValid = false;
        validationError = 'Variant does not belong to product';
      }

      let availableStock = 0;
      if (variant) {
        availableStock = await this.getEffectiveAvailableStock(variant.id);
        if (availableStock < item.quantity) {
          isValid = false;
          validationError = availableStock === 0
            ? 'Item is currently out of stock'
            : `Only ${availableStock} units available (in cart: ${item.quantity})`;
        }
      }

      if (!isValid) {
        hasInvalidItems = true;
      }

      // Unit price: variant price takes precedence if set, otherwise product price
      const unitPrice = Number(
        variant?.price !== null && variant?.price !== undefined
          ? variant.price
          : product?.price ?? 0,
      );

      const vatRate = Number(product?.vatRate ?? 0);
      const vatIncluded = Boolean(product?.vatIncluded ?? false);
      const subtotal = Number((unitPrice * item.quantity).toFixed(2));

      // Calculate tax
      let taxAmount = 0;
      if (vatRate > 0) {
        if (vatIncluded) {
          taxAmount = Number((subtotal - subtotal / (1 + vatRate / 100)).toFixed(2));
        } else {
          taxAmount = Number(((subtotal * vatRate) / 100).toFixed(2));
        }
      }

      const total = vatIncluded ? subtotal : Number((subtotal + taxAmount).toFixed(2));

      overallTotalItems += item.quantity;
      overallSubtotal = Number((overallSubtotal + subtotal).toFixed(2));
      overallTax = Number((overallTax + taxAmount).toFixed(2));

      // Format variant description
      const variantParts: string[] = [];
      if (variant?.size) variantParts.push(`Size: ${variant.size}`);
      if (variant?.color) variantParts.push(`Color: ${variant.color}`);
      if (variant?.model) variantParts.push(`Model: ${variant.model}`);
      if (variant?.attributeKey && variant?.attributeValue) {
        variantParts.push(`${variant.attributeKey}: ${variant.attributeValue}`);
      }

      const detail: CartItemDetail = {
        id: item.id,
        productId: item.productId,
        productName: product?.name ?? 'Unknown Product',
        variantId: item.variantId,
        variantDescription: variantParts.length > 0 ? variantParts.join(', ') : null,
        sku: variant?.sku ?? product?.sku ?? null,
        storeId: item.storeId,
        storeName: store?.name ?? 'Unknown Store',
        unitPrice,
        vatRate,
        vatIncluded,
        quantity: item.quantity,
        subtotal,
        taxAmount,
        total,
        availableStock,
        isValid,
        validationError,
      };

      const groupKey = item.storeId;
      if (!itemsByStoreMap.has(groupKey)) {
        itemsByStoreMap.set(groupKey, {
          storeId: item.storeId,
          storeName: store?.name ?? 'Unknown Store',
          storeSubtotal: 0,
          storeTax: 0,
          storeTotal: 0,
          items: [],
        });
      }

      const group = itemsByStoreMap.get(groupKey)!;
      group.items.push(detail);
      group.storeSubtotal = Number((group.storeSubtotal + subtotal).toFixed(2));
      group.storeTax = Number((group.storeTax + taxAmount).toFixed(2));
      group.storeTotal = Number((group.storeTotal + total).toFixed(2));
    }

    const overallTotal = Number((overallSubtotal + (overallTax && rawItems.some(i => !i.product?.vatIncluded) ? overallTax : 0)).toFixed(2));

    return {
      id: cart.id,
      customerId,
      totalItems: overallTotalItems,
      subtotal: overallSubtotal,
      taxAmount: overallTax,
      totalAmount: overallTotal,
      currency: 'USD',
      stores: Array.from(itemsByStoreMap.values()),
      hasInvalidItems,
    };
  }

  /**
   * Add a product / variant to the customer's cart.
   */
  async addItem(customerId: string, dto: AddCartItemDto): Promise<CartSummaryResponse> {
    if (dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const cart = await this.getOrCreateCart(customerId);

    // 1. Validate Product
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
      relations: { store: true, variants: true },
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    if (product.status !== ProductStatus.PUBLISHED) {
      throw new BadRequestException(
        `Product cannot be added to cart because its status is ${product.status}`,
      );
    }

    // 2. Validate Store
    if (!product.store || product.store.status !== StoreStatus.ACTIVE) {
      throw new BadRequestException('Store is not currently active');
    }

    // 3. Resolve and validate Variant
    let targetVariant: ProductVariant | null = null;
    if (dto.variantId) {
      targetVariant = await this.variantRepo.findOne({
        where: { id: dto.variantId },
      });

      if (!targetVariant) {
        throw new NotFoundException(`Product variant ${dto.variantId} not found`);
      }

      if (targetVariant.productId !== product.id) {
        throw new BadRequestException('Variant does not belong to the specified product');
      }

      if (!targetVariant.isActive) {
        throw new BadRequestException('The selected product variant is currently inactive');
      }
    } else {
      // If variantId is omitted, pick the default/first active variant if any exists
      if (product.variants && product.variants.length > 0) {
        const activeVariant = product.variants.find((v) => v.isActive);
        if (!activeVariant) {
          throw new BadRequestException('No active variants available for this product');
        }
        targetVariant = activeVariant;
      } else {
        throw new BadRequestException(
          'Product has no variants configured. Please contact store support.',
        );
      }
    }

    // 4. Validate Inventory
    const availableStock = await this.getEffectiveAvailableStock(targetVariant.id);

    // Check existing item in cart
    const existingItem = await this.cartItemRepo.findOne({
      where: {
        cartId: cart.id,
        productId: product.id,
        variantId: targetVariant.id,
      },
    });

    const totalRequestedQuantity = (existingItem?.quantity ?? 0) + dto.quantity;

    if (availableStock < totalRequestedQuantity) {
      throw new BadRequestException(
        `Insufficient stock for ${product.name}. Requested total: ${totalRequestedQuantity}, available: ${availableStock}`,
      );
    }

    // 5. Upsert Cart Item
    if (existingItem) {
      existingItem.quantity = totalRequestedQuantity;
      await this.cartItemRepo.save(existingItem);
    } else {
      const newItem = this.cartItemRepo.create({
        cartId: cart.id,
        productId: product.id,
        variantId: targetVariant.id,
        storeId: product.storeId,
        quantity: dto.quantity,
      });
      await this.cartItemRepo.save(newItem);
    }

    await this.auditService.log({
      actorUserId: customerId,
      action: AuditAction.CART_ITEM_ADDED,
      resource: 'cart_item',
      resourceId: targetVariant.id,
      metadata: {
        cartId: cart.id,
        productId: product.id,
        variantId: targetVariant.id,
        quantity: dto.quantity,
        storeId: product.storeId,
      },
    });

    return this.getCart(customerId);
  }

  /**
   * Update quantity of an item in the cart.
   */
  async updateItem(
    customerId: string,
    itemId: string,
    dto: UpdateCartItemDto,
  ): Promise<CartSummaryResponse> {
    if (dto.quantity < 1) {
      throw new BadRequestException('Quantity must be at least 1');
    }

    const cart = await this.getOrCreateCart(customerId);

    const item = await this.cartItemRepo.findOne({
      where: { id: itemId, cartId: cart.id },
      relations: { product: true, variant: true },
    });

    if (!item) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found in customer cart`);
    }

    if (item.variantId) {
      const availableStock = await this.getEffectiveAvailableStock(item.variantId);
      if (availableStock < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock. Requested: ${dto.quantity}, available: ${availableStock}`,
        );
      }
    }

    item.quantity = dto.quantity;
    await this.cartItemRepo.save(item);

    return this.getCart(customerId);
  }

  /**
   * Remove an item from the customer's cart.
   */
  async removeItem(customerId: string, itemId: string): Promise<CartSummaryResponse> {
    const cart = await this.getOrCreateCart(customerId);

    const item = await this.cartItemRepo.findOne({
      where: { id: itemId, cartId: cart.id },
    });

    if (!item) {
      throw new NotFoundException(`Cart item with ID ${itemId} not found in customer cart`);
    }

    await this.cartItemRepo.remove(item);

    return this.getCart(customerId);
  }

  /**
   * Clear all items from customer's cart.
   */
  async clearCart(customerId: string): Promise<{ message: string }> {
    const cart = await this.getOrCreateCart(customerId);

    await this.cartItemRepo.delete({ cartId: cart.id });

    await this.auditService.log({
      actorUserId: customerId,
      action: AuditAction.CART_CLEARED,
      resource: 'cart',
      resourceId: cart.id,
      metadata: { customerId },
    });

    return { message: 'Cart cleared successfully' };
  }
}
