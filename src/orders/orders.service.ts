import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Order } from './entities/order.entity.js';
import { StoreOrder } from './entities/store-order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { InventoryReservation } from './entities/inventory-reservation.entity.js';
import { Cart } from '../cart/entities/cart.entity.js';
import { CartItem } from '../cart/entities/cart-item.entity.js';
import { Product } from '../products/entities/product.entity.js';
import { ProductVariant } from '../products/entities/product-variant.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { User } from '../users/entities/user.entity.js';
import { OrderStatus } from './enums/order-status.enum.js';
import { StoreOrderStatus } from './enums/store-order-status.enum.js';
import { ReservationStatus } from './enums/reservation-status.enum.js';
import { ProductStatus } from '../products/enums/product-status.enum.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { CheckoutDto } from './dto/checkout.dto.js';
import { GuestCheckoutDto } from './dto/guest-checkout.dto.js';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto.js';
import { UpdateStoreOrderStatusDto } from './dto/update-store-order-status.dto.js';
import { OrderQueryDto, StoreOrderQueryDto } from './dto/order-query.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(StoreOrder)
    private readonly storeOrderRepo: Repository<StoreOrder>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(InventoryReservation)
    private readonly reservationRepo: Repository<InventoryReservation>,
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
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly dataSource: DataSource,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}


  // ──────────────────────────────────────────────────────────────────────────
  // 1. MULTI-VENDOR CHECKOUT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Executes multi-vendor checkout within an atomic PostgreSQL transaction.
   * Locks inventory, validates products/stores, creates Parent Order + Store Orders + OrderItems,
   * creates 15-minute time-bound stock reservations, and clears customer cart.
   */
  async checkout(customerId: string, dto: CheckoutDto): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Retrieve customer cart
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { customerId },
      });

      if (!cart) {
        throw new BadRequestException('Shopping cart is empty. Please add items before checkout.');
      }

      const cartItems = await queryRunner.manager.find(CartItem, {
        where: { cartId: cart.id },
        relations: {
          product: { store: true },
          variant: true,
          store: true,
        },
      });

      if (cartItems.length === 0) {
        throw new BadRequestException('Shopping cart is empty. Please add items before checkout.');
      }

      // Group cart items by store
      const itemsByStore = new Map<string, CartItem[]>();
      for (const item of cartItems) {
        const storeList = itemsByStore.get(item.storeId) ?? [];
        storeList.push(item);
        itemsByStore.set(item.storeId, storeList);
      }

      // 2. Validate all items & lock variants atomically
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-minute reservation window

      // Generate parent order number
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${timestamp}-${randomSuffix}`;

      // Create parent order instance
      const parentOrder = queryRunner.manager.create(Order, {
        orderNumber,
        customerId,
        status: OrderStatus.PENDING,
        subtotal: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: 'USD',
        shippingAddress: dto.shippingAddress as unknown as Record<string, unknown>,
        customerNotes: dto.customerNotes ?? null,
      });

      const savedParentOrder = await queryRunner.manager.save(Order, parentOrder);

      let overallSubtotal = 0;
      let overallTax = 0;
      let overallTotal = 0;

      // Process each store order
      for (const [storeId, storeCartItems] of itemsByStore.entries()) {
        const store = storeCartItems[0]?.store;
        if (!store || store.status !== StoreStatus.ACTIVE) {
          throw new BadRequestException(
            `Store "${store?.name ?? storeId}" is not currently active for checkout`,
          );
        }

        const storeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const storeOrderNumber = `SO-${timestamp}-${storeSuffix}`;

        const storeOrder = queryRunner.manager.create(StoreOrder, {
          storeOrderNumber,
          orderId: savedParentOrder.id,
          storeId,
          status: StoreOrderStatus.PENDING,
          subtotal: 0,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          shippingAddressSnapshot: dto.shippingAddress as unknown as Record<string, unknown>,
          notes: dto.customerNotes ?? null,
        });

        const savedStoreOrder = await queryRunner.manager.save(StoreOrder, storeOrder);

        let storeSubtotal = 0;
        let storeTax = 0;
        let storeTotal = 0;

        for (const cartItem of storeCartItems) {
          const product = cartItem.product;
          if (!product) {
            throw new BadRequestException('A product in your cart no longer exists');
          }

          if (product.status !== ProductStatus.PUBLISHED) {
            throw new BadRequestException(
              `Product "${product.name}" is no longer available for purchase (status: ${product.status})`,
            );
          }

          if (product.storeId !== storeId) {
            throw new BadRequestException(`Product "${product.name}" does not belong to store`);
          }

          if (!cartItem.variantId) {
            throw new BadRequestException(`Product variant missing for "${product.name}"`);
          }

          // Pessimistic write lock on variant to avoid race-condition overselling
          const variant = await queryRunner.manager.findOne(ProductVariant, {
            where: { id: cartItem.variantId },
            lock: { mode: 'pessimistic_write' },
          });

          if (!variant || !variant.isActive) {
            throw new BadRequestException(
              `Selected variant for "${product.name}" is not active or no longer exists`,
            );
          }

          if (variant.productId !== product.id) {
            throw new BadRequestException(`Variant does not match product "${product.name}"`);
          }

          // Calculate current active reservations for this variant
          const activeReservationsRaw = await queryRunner.manager
            .createQueryBuilder(InventoryReservation, 'ir')
            .select('SUM(ir.quantity)', 'totalReserved')
            .where('ir.variantId = :variantId', { variantId: variant.id })
            .andWhere('ir.status = :status', { status: ReservationStatus.ACTIVE })
            .andWhere('ir.expiresAt > :now', { now: new Date() })
            .getRawOne<{ totalReserved: string | null }>();

          const currentlyReserved = activeReservationsRaw?.totalReserved
            ? parseInt(activeReservationsRaw.totalReserved, 10)
            : 0;

          const availableStock = variant.stockQuantity - currentlyReserved;

          if (availableStock < cartItem.quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}" (SKU: ${variant.sku || variant.id}). ` +
                `Requested: ${cartItem.quantity}, available: ${Math.max(0, availableStock)}`,
            );
          }

          // Authoritative price calculation
          const unitPrice = Number(
            variant.price !== null && variant.price !== undefined
              ? variant.price
              : product.price,
          );
          const vatRate = Number(product.vatRate ?? 0);
          const vatIncluded = Boolean(product.vatIncluded ?? false);
          const itemSubtotal = Number((unitPrice * cartItem.quantity).toFixed(2));

          let itemTax = 0;
          if (vatRate > 0) {
            if (vatIncluded) {
              itemTax = Number((itemSubtotal - itemSubtotal / (1 + vatRate / 100)).toFixed(2));
            } else {
              itemTax = Number(((itemSubtotal * vatRate) / 100).toFixed(2));
            }
          }

          const itemTotal = vatIncluded ? itemSubtotal : Number((itemSubtotal + itemTax).toFixed(2));

          storeSubtotal = Number((storeSubtotal + itemSubtotal).toFixed(2));
          storeTax = Number((storeTax + itemTax).toFixed(2));
          storeTotal = Number((storeTotal + itemTotal).toFixed(2));

          // Variant snapshot
          const variantSnapshot: Record<string, unknown> = {
            size: variant.size,
            color: variant.color,
            model: variant.model,
            attributeKey: variant.attributeKey,
            attributeValue: variant.attributeValue,
          };

          // Create OrderItem
          const orderItem = queryRunner.manager.create(OrderItem, {
            storeOrderId: savedStoreOrder.id,
            productId: product.id,
            variantId: variant.id,
            storeId: storeId,
            productNameSnapshot: product.name,
            skuSnapshot: variant.sku ?? product.sku ?? null,
            variantSnapshot,
            unitPrice,
            vatRate,
            vatIncluded,
            vatCode: product.vatCode,
            quantity: cartItem.quantity,
            subtotal: itemSubtotal,
            taxAmount: itemTax,
            total: itemTotal,
          });

          await queryRunner.manager.save(OrderItem, orderItem);

          // Create InventoryReservation (15-minute active hold)
          const reservation = queryRunner.manager.create(InventoryReservation, {
            orderId: savedParentOrder.id,
            storeOrderId: savedStoreOrder.id,
            productId: product.id,
            variantId: variant.id,
            storeId: storeId,
            quantity: cartItem.quantity,
            status: ReservationStatus.ACTIVE,
            expiresAt,
          });

          await queryRunner.manager.save(InventoryReservation, reservation);
        }

        // Update StoreOrder totals
        savedStoreOrder.subtotal = storeSubtotal;
        savedStoreOrder.taxAmount = storeTax;
        savedStoreOrder.totalAmount = storeTotal;
        await queryRunner.manager.save(StoreOrder, savedStoreOrder);

        overallSubtotal = Number((overallSubtotal + storeSubtotal).toFixed(2));
        overallTax = Number((overallTax + storeTax).toFixed(2));
        overallTotal = Number((overallTotal + storeTotal).toFixed(2));
      }

      // Update Parent Order totals
      savedParentOrder.subtotal = overallSubtotal;
      savedParentOrder.taxAmount = overallTax;
      savedParentOrder.totalAmount = overallTotal;
      await queryRunner.manager.save(Order, savedParentOrder);

      // 3. Clear Customer Cart
      await queryRunner.manager.delete(CartItem, { cartId: cart.id });

      // Commit transaction
      await queryRunner.commitTransaction();

      // Trigger order confirmation email
      const customer = await this.userRepo.findOne({ where: { id: customerId } });
      if (customer?.email) {
        await this.notificationsService.sendOrderConfirmationEmail(
          customer.email,
          savedParentOrder.orderNumber,
          Number(savedParentOrder.totalAmount),
          savedParentOrder.currency,
          cartItems.length,
        );
      }

      // Audit Log
      await this.auditService.log({
        actorUserId: customerId,
        action: AuditAction.ORDER_CREATED,
        resource: 'order',
        resourceId: savedParentOrder.id,
        metadata: {
          orderNumber: savedParentOrder.orderNumber,
          totalAmount: savedParentOrder.totalAmount,
          storesCount: itemsByStore.size,
          itemCount: cartItems.length,
        },
      });

      return this.findOneOrderForCustomer(savedParentOrder.id, customerId);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Executes guest checkout for unauthenticated shoppers.
   * Creates Parent Order + Store Orders + Order Items + 15-minute reservations without customer login.
   */
  async guestCheckout(
    dto: GuestCheckoutDto,
    ip?: string,
    userAgent?: string,
  ): Promise<Order> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('No items provided for guest checkout');
      }

      // Resolve any missing variantIds using productId
      for (const item of dto.items) {
        if (!item.variantId && (item as any).productId) {
          const defaultVariant = await queryRunner.manager.findOne(ProductVariant, {
            where: { productId: (item as any).productId, isActive: true },
          });
          if (defaultVariant) {
            item.variantId = defaultVariant.id;
          }
        }
        if (!item.variantId) {
          throw new BadRequestException('Each checkout item must have a valid variant or product ID');
        }
      }

      // Load variants and associated products
      const variantIds = dto.items.map((i) => i.variantId as string);

      // 1. Pessimistic write lock directly on variant rows (avoids PostgreSQL outer join FOR UPDATE error)
      await queryRunner.manager.find(ProductVariant, {
        where: { id: In(variantIds) },
        lock: { mode: 'pessimistic_write' },
      });

      // 2. Load variants with their product and store relations
      const variants = await queryRunner.manager.find(ProductVariant, {
        where: { id: In(variantIds) },
        relations: { product: { store: true } },
      });

      const variantMap = new Map<string, ProductVariant>();
      for (const v of variants) {
        variantMap.set(v.id, v);
      }

      // Group items by store
      const itemsByStore = new Map<
        string,
        Array<{ variant: ProductVariant; quantity: number }>
      >();

      for (const item of dto.items) {
        const variant = variantMap.get(item.variantId!);
        if (!variant || !variant.isActive) {
          throw new BadRequestException(`Variant ${item.variantId} is invalid or inactive`);
        }
        const product = variant.product;
        if (!product || product.status !== ProductStatus.PUBLISHED) {
          throw new BadRequestException(
            `Product "${product?.name ?? item.variantId}" is not available for purchase`,
          );
        }
        const store = product.store;
        if (!store || store.status !== StoreStatus.ACTIVE) {
          throw new BadRequestException(`Store for product "${product.name}" is not active`);
        }

        const storeList = itemsByStore.get(store.id) ?? [];
        storeList.push({ variant, quantity: item.quantity });
        itemsByStore.set(store.id, storeList);
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60 * 1000); // 15-min reservation
      const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
      const orderNumber = `ORD-${timestamp}-${randomSuffix}`;

      const parentOrder = queryRunner.manager.create(Order, {
        orderNumber,
        customerId: null,
        isGuest: true,
        guestEmail: dto.guestEmail,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        status: OrderStatus.PENDING,
        subtotal: 0,
        shippingAmount: 0,
        taxAmount: 0,
        totalAmount: 0,
        currency: 'EUR',
        shippingAddress: dto.shippingAddress as unknown as Record<string, unknown>,
        customerNotes: dto.customerNotes ?? null,
      });

      const savedParentOrder = await queryRunner.manager.save(Order, parentOrder);

      let overallSubtotal = 0;
      let overallTax = 0;
      let overallTotal = 0;

      for (const [storeId, storeItems] of itemsByStore.entries()) {
        const storeSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
        const storeOrderNumber = `SO-${timestamp}-${storeSuffix}`;

        const storeOrder = queryRunner.manager.create(StoreOrder, {
          storeOrderNumber,
          orderId: savedParentOrder.id,
          storeId,
          status: StoreOrderStatus.PENDING,
          subtotal: 0,
          shippingAmount: 0,
          taxAmount: 0,
          totalAmount: 0,
          shippingAddressSnapshot: dto.shippingAddress as unknown as Record<string, unknown>,
          notes: dto.customerNotes ?? null,
        });

        const savedStoreOrder = await queryRunner.manager.save(StoreOrder, storeOrder);

        let storeSubtotal = 0;
        let storeTax = 0;
        let storeTotal = 0;

        for (const { variant, quantity } of storeItems) {
          const product = variant.product;

          // Check active reservations
          const activeReservationsRaw = await queryRunner.manager
            .createQueryBuilder(InventoryReservation, 'ir')
            .select('SUM(ir.quantity)', 'totalReserved')
            .where('ir.variantId = :variantId', { variantId: variant.id })
            .andWhere('ir.status = :status', { status: ReservationStatus.ACTIVE })
            .andWhere('ir.expiresAt > :now', { now: new Date() })
            .getRawOne<{ totalReserved: string | null }>();

          const currentlyReserved = activeReservationsRaw?.totalReserved
            ? parseInt(activeReservationsRaw.totalReserved, 10)
            : 0;

          const availableStock = variant.stockQuantity - currentlyReserved;
          if (availableStock < quantity) {
            throw new BadRequestException(
              `Insufficient stock for "${product.name}" (SKU: ${variant.sku || variant.id}). ` +
                `Requested: ${quantity}, available: ${Math.max(0, availableStock)}`,
            );
          }

          const unitPrice = Number(
            variant.price !== null && variant.price !== undefined ? variant.price : product.price,
          );
          const vatRate = Number(product.vatRate ?? 0);
          const vatIncluded = Boolean(product.vatIncluded ?? false);
          const itemSubtotal = Number((unitPrice * quantity).toFixed(2));

          let itemTax = 0;
          if (vatRate > 0) {
            if (vatIncluded) {
              itemTax = Number((itemSubtotal - itemSubtotal / (1 + vatRate / 100)).toFixed(2));
            } else {
              itemTax = Number(((itemSubtotal * vatRate) / 100).toFixed(2));
            }
          }

          const itemTotal = vatIncluded ? itemSubtotal : Number((itemSubtotal + itemTax).toFixed(2));

          storeSubtotal = Number((storeSubtotal + itemSubtotal).toFixed(2));
          storeTax = Number((storeTax + itemTax).toFixed(2));
          storeTotal = Number((storeTotal + itemTotal).toFixed(2));

          const orderItem = queryRunner.manager.create(OrderItem, {
            storeOrderId: savedStoreOrder.id,
            productId: product.id,
            variantId: variant.id,
            storeId,
            productNameSnapshot: product.name,
            skuSnapshot: variant.sku ?? product.sku ?? null,
            variantSnapshot: {
              size: variant.size,
              color: variant.color,
              model: variant.model,
              attributeKey: variant.attributeKey,
              attributeValue: variant.attributeValue,
            },
            unitPrice,
            vatRate,
            vatIncluded,
            vatCode: product.vatCode,
            quantity,
            subtotal: itemSubtotal,
            taxAmount: itemTax,
            total: itemTotal,
          });

          await queryRunner.manager.save(OrderItem, orderItem);

          const reservation = queryRunner.manager.create(InventoryReservation, {
            orderId: savedParentOrder.id,
            storeOrderId: savedStoreOrder.id,
            productId: product.id,
            variantId: variant.id,
            storeId,
            quantity,
            status: ReservationStatus.ACTIVE,
            expiresAt,
          });

          await queryRunner.manager.save(InventoryReservation, reservation);
        }

        savedStoreOrder.subtotal = storeSubtotal;
        savedStoreOrder.taxAmount = storeTax;
        savedStoreOrder.totalAmount = storeTotal;
        await queryRunner.manager.save(StoreOrder, savedStoreOrder);

        overallSubtotal = Number((overallSubtotal + storeSubtotal).toFixed(2));
        overallTax = Number((overallTax + storeTax).toFixed(2));
        overallTotal = Number((overallTotal + storeTotal).toFixed(2));
      }

      savedParentOrder.subtotal = overallSubtotal;
      savedParentOrder.taxAmount = overallTax;
      savedParentOrder.totalAmount = overallTotal;
      await queryRunner.manager.save(Order, savedParentOrder);

      await queryRunner.commitTransaction();

      // Dispatch order confirmation email
      await this.notificationsService.sendOrderConfirmationEmail(
        dto.guestEmail,
        savedParentOrder.orderNumber,
        savedParentOrder.totalAmount,
        savedParentOrder.currency,
        dto.items.length,
      );

      // Audit Log
      await this.auditService.log({
        actorUserId: null,
        action: AuditAction.GUEST_ORDER_CREATED,
        resource: 'order',
        resourceId: savedParentOrder.id,
        ipAddress: ip,
        userAgent,
        metadata: {
          orderNumber: savedParentOrder.orderNumber,
          guestEmail: dto.guestEmail,
          totalAmount: savedParentOrder.totalAmount,
          storesCount: itemsByStore.size,
          itemCount: dto.items.length,
        },
      });

      return this.findOneOrderAdmin(savedParentOrder.id);
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Guest order tracking lookup by orderNumber and guestEmail.
   */
  async trackGuestOrder(orderNumber: string, guestEmail: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { orderNumber, guestEmail, isGuest: true },
      relations: {
        storeOrders: {
          store: true,
          items: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Order with number ${orderNumber} not found for email ${guestEmail}`,
      );
    }

    return order;
  }


  // ──────────────────────────────────────────────────────────────────────────
  // 2. CUSTOMER ORDERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Customer order history with pagination.
   */
  async findCustomerOrders(
    customerId: string,
    query: OrderQueryDto,
  ): Promise<PaginatedResult<Order>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.storeOrders', 'so')
      .leftJoinAndSelect('so.store', 's')
      .leftJoinAndSelect('so.items', 'oi')
      .where('o.customerId = :customerId', { customerId })
      .orderBy('o.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere('o.orderNumber ILIKE :search', { search: `%${query.search}%` });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find single customer order with strict ownership check.
   */
  async findOneOrderForCustomer(orderId: string, customerId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: {
        storeOrders: {
          store: true,
          items: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * Customer cancels order (allowed in PENDING or before fulfillment progresses).
   */
  async cancelCustomerOrder(orderId: string, customerId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, customerId },
      relations: { storeOrders: true, reservations: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Order is already cancelled');
    }

    // Cancellation check: cannot cancel if any store order is SHIPPED or DELIVERED
    const hasShippedOrDelivered = order.storeOrders.some(
      (so) =>
        so.status === StoreOrderStatus.SHIPPED ||
        so.status === StoreOrderStatus.DELIVERED,
    );

    if (hasShippedOrDelivered) {
      throw new BadRequestException(
        'Cannot cancel order because one or more store orders have already shipped or been delivered',
      );
    }

    // Cancel order and all store orders
    order.status = OrderStatus.CANCELLED;
    for (const so of order.storeOrders) {
      so.status = StoreOrderStatus.CANCELLED;
      await this.storeOrderRepo.save(so);
    }
    await this.orderRepo.save(order);

    // Release active inventory reservations
    await this.releaseReservations(order.id);

    await this.auditService.log({
      actorUserId: customerId,
      action: AuditAction.ORDER_CANCELLED,
      resource: 'order',
      resourceId: order.id,
      metadata: { orderNumber: order.orderNumber, cancelledBy: 'CUSTOMER' },
    });

    return this.findOneOrderForCustomer(order.id, customerId);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STORE ADMIN ORDER MANAGEMENT (TENANT-ISOLATED)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Find store orders for authenticated store only.
   */
  async findStoreOrders(
    storeId: string,
    query: StoreOrderQueryDto,
  ): Promise<PaginatedResult<StoreOrder>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.storeOrderRepo
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.order', 'o')
      .leftJoinAndSelect('so.items', 'oi')
      .where('so.storeId = :storeId', { storeId })
      .andWhere('o.status != :pendingStatus', { pendingStatus: OrderStatus.PENDING })
      .orderBy('so.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('so.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(so.storeOrderNumber ILIKE :search OR o.orderNumber ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find single store order detail for authenticated store.
   */
  async findOneStoreOrder(storeOrderId: string, storeId: string): Promise<StoreOrder> {
    const storeOrder = await this.storeOrderRepo.findOne({
      where: { id: storeOrderId, storeId },
      relations: {
        order: { customer: true },
        items: true,
      },
    });

    if (!storeOrder) {
      throw new NotFoundException(`Store order with ID ${storeOrderId} not found`);
    }

    return storeOrder;
  }

  /**
   * Store Admin updates fulfillment status of their store order.
   * Synchronizes and rolls up Parent Order status accordingly.
   */
  async updateStoreOrderStatus(
    storeOrderId: string,
    storeId: string,
    dto: UpdateStoreOrderStatusDto,
    actorId?: string,
  ): Promise<StoreOrder> {
    const storeOrder = await this.storeOrderRepo.findOne({
      where: { id: storeOrderId, storeId },
      relations: { order: true },
    });

    if (!storeOrder) {
      throw new NotFoundException(`Store order with ID ${storeOrderId} not found`);
    }

    const prevStatus = storeOrder.status;

    // Validate transition (allow updates if within valid states)
    if (prevStatus !== dto.status) {
      this.assertValidStoreOrderTransition(prevStatus, dto.status);
    }

    storeOrder.status = dto.status;
    if (dto.notes) {
      storeOrder.notes = storeOrder.notes
        ? `${storeOrder.notes}\n[${new Date().toISOString()}]: ${dto.notes}`
        : dto.notes;
    }

    if (dto.trackingNumber) {
      storeOrder.trackingNumber = dto.trackingNumber;
    }
    if (dto.carrier) {
      storeOrder.carrier = dto.carrier;
    }
    if (dto.trackingUrl) {
      storeOrder.trackingUrl = dto.trackingUrl;
    } else if (dto.trackingNumber && (!storeOrder.carrier || storeOrder.carrier.toLowerCase().includes('posti'))) {
      const trackingBase = process.env.POSTI_TRACKING_BASE_URL || 'https://www.posti.fi/en/tracking#/seuranta/';
      storeOrder.trackingUrl = `${trackingBase}${dto.trackingNumber}`;
    }

    await this.storeOrderRepo.save(storeOrder);

    // If cancelled, release reservations for this store order
    if (dto.status === StoreOrderStatus.CANCELLED) {
      await this.releaseStoreOrderReservations(storeOrderId);
    }

    // Roll up status to Parent Order
    await this.syncParentOrderStatus(storeOrder.orderId);

    // Send shipping update email if status is SHIPPED
    if (dto.status === StoreOrderStatus.SHIPPED) {
      const parentOrder = await this.orderRepo.findOne({
        where: { id: storeOrder.orderId },
        relations: { customer: true },
      });
      const recipient = parentOrder?.customer?.email || parentOrder?.guestEmail;
      if (recipient && parentOrder) {
        await this.notificationsService.sendShippingNotificationEmail(
          recipient,
          parentOrder.orderNumber,
          storeOrder.storeOrderNumber,
          dto.trackingNumber,
        );
      }
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_ORDER_STATUS_CHANGED,
      resource: 'store_order',
      resourceId: storeOrder.id,
      metadata: {
        storeId,
        orderId: storeOrder.orderId,
        prevStatus,
        newStatus: dto.status,
      },
    });

    return this.findOneStoreOrder(storeOrderId, storeId);

  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PLATFORM ADMIN ORDER MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * List all parent orders across all stores for Platform Admin.
   */
  async findAllOrdersAdmin(query: OrderQueryDto): Promise<PaginatedResult<Order>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.orderRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'c')
      .leftJoinAndSelect('o.storeOrders', 'so')
      .leftJoinAndSelect('so.store', 's')
      .leftJoinAndSelect('so.items', 'oi')
      .orderBy('o.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('o.status = :status', { status: query.status });
    }

    if (query.customerId) {
      qb.andWhere('o.customerId = :customerId', { customerId: query.customerId });
    }

    if (query.storeId) {
      qb.andWhere('so.storeId = :storeId', { storeId: query.storeId });
    }

    if (query.search) {
      qb.andWhere(
        '(o.orderNumber ILIKE :search OR c.name ILIKE :search OR c.email ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find single parent order detail for Platform Admin.
   */
  async findOneOrderAdmin(orderId: string): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        customer: true,
        storeOrders: {
          store: true,
          items: true,
        },
        reservations: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    return order;
  }

  /**
   * Platform Admin: list all store orders across the marketplace.
   */
  async findAllStoreOrdersAdmin(query: StoreOrderQueryDto): Promise<PaginatedResult<StoreOrder>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.storeOrderRepo
      .createQueryBuilder('so')
      .leftJoinAndSelect('so.store', 's')
      .leftJoinAndSelect('so.order', 'o')
      .leftJoinAndSelect('o.customer', 'c')
      .leftJoinAndSelect('so.items', 'oi')
      .orderBy('so.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('so.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(so.storeOrderNumber ILIKE :search OR o.orderNumber ILIKE :search OR s.name ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Platform Admin: get single store order.
   */
  async findOneStoreOrderAdmin(storeOrderId: string): Promise<StoreOrder> {
    const storeOrder = await this.storeOrderRepo.findOne({
      where: { id: storeOrderId },
      relations: {
        store: true,
        order: { customer: true },
        items: true,
      },
    });

    if (!storeOrder) {
      throw new NotFoundException(`Store order with ID ${storeOrderId} not found`);
    }

    return storeOrder;
  }

  /**
   * Platform Admin: update parent order status.
   */
  async updateOrderStatusAdmin(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actorId?: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { storeOrders: true, reservations: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    const prevStatus = order.status;
    order.status = dto.status;

    // If order transitioned to PAID: convert reservations & deduct stock
    if (dto.status === OrderStatus.PAID && prevStatus === OrderStatus.PENDING) {
      await this.convertReservationsAndDeductStock(order.id);
      // Propagate status to store orders if appropriate
      for (const so of order.storeOrders) {
        if (so.status === StoreOrderStatus.PENDING) {
          so.status = StoreOrderStatus.PROCESSING;
          await this.storeOrderRepo.save(so);
        }
      }
    }

    // If order transitioned to CANCELLED: release reservations & cancel store orders
    if (dto.status === OrderStatus.CANCELLED) {
      for (const so of order.storeOrders) {
        if (
          so.status !== StoreOrderStatus.SHIPPED &&
          so.status !== StoreOrderStatus.DELIVERED
        ) {
          so.status = StoreOrderStatus.CANCELLED;
          await this.storeOrderRepo.save(so);
        }
      }
      await this.releaseReservations(order.id);
    }

    await this.orderRepo.save(order);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.ORDER_STATUS_CHANGED,
      resource: 'order',
      resourceId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        prevStatus,
        newStatus: dto.status,
        reason: dto.reason,
      },
    });

    return this.findOneOrderAdmin(order.id);
  }

  /**
   * Transition order to PAID upon successful Stripe payment verification.
   * Converts stock reservations to permanent deductions and updates store orders to PROCESSING.
   */
  async markOrderAsPaid(
    orderId: string,
    paymentMethod = 'STRIPE',
    transactionRef?: string,
  ): Promise<Order> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        storeOrders: {
          items: { product: true, variant: true },
          store: true,
        },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${orderId} not found`);
    }

    if (order.status === OrderStatus.PAID) {
      return order;
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot mark a cancelled order as paid');
    }

    order.status = OrderStatus.PAID;

    // Convert stock reservations to permanent stock deduction
    await this.convertReservationsAndDeductStock(order.id);

    // Update child store orders to PROCESSING
    if (order.storeOrders && order.storeOrders.length > 0) {
      for (const so of order.storeOrders) {
        if (so.status === StoreOrderStatus.PENDING) {
          so.status = StoreOrderStatus.PROCESSING;
          await this.storeOrderRepo.save(so);
        }
      }
    }

    await this.orderRepo.save(order);

    await this.auditService.log({
      actorUserId: order.customerId ?? null,
      action: AuditAction.ORDER_STATUS_CHANGED,
      resource: 'order',
      resourceId: order.id,
      metadata: {
        orderNumber: order.orderNumber,
        prevStatus: OrderStatus.PENDING,
        newStatus: OrderStatus.PAID,
        paymentMethod,
        transactionRef,
      },
    });

    return order;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. STATUS SYNCHRONIZATION & INVENTORY RESERVATION HELPERS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Synchronize Parent Order status based on all its child Store Orders.
   * - All CANCELLED => Parent CANCELLED
   * - All DELIVERED => Parent DELIVERED
   * - All SHIPPED (or combination of SHIPPED & DELIVERED) => Parent SHIPPED
   * - Any SHIPPED or DELIVERED, but not all => Parent PARTIALLY_SHIPPED
   * - Any PROCESSING and none shipped/delivered => Parent PROCESSING
   */
  async syncParentOrderStatus(orderId: string): Promise<void> {
    const parentOrder = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: { storeOrders: true },
    });

    if (!parentOrder || parentOrder.storeOrders.length === 0) return;

    // Do not alter parent status if already REFUNDED or explicitly CANCELLED
    if (parentOrder.status === OrderStatus.REFUNDED) return;

    const storeOrders = parentOrder.storeOrders;
    const nonCancelled = storeOrders.filter((so) => so.status !== StoreOrderStatus.CANCELLED);

    if (nonCancelled.length === 0) {
      // All store orders are cancelled
      parentOrder.status = OrderStatus.CANCELLED;
    } else {
      const allDelivered = nonCancelled.every((so) => so.status === StoreOrderStatus.DELIVERED);
      const allShippedOrDelivered = nonCancelled.every(
        (so) =>
          so.status === StoreOrderStatus.SHIPPED ||
          so.status === StoreOrderStatus.DELIVERED,
      );
      const anyShippedOrDelivered = nonCancelled.some(
        (so) =>
          so.status === StoreOrderStatus.SHIPPED ||
          so.status === StoreOrderStatus.DELIVERED,
      );
      const anyProcessing = nonCancelled.some((so) => so.status === StoreOrderStatus.PROCESSING);

      if (allDelivered) {
        parentOrder.status = OrderStatus.DELIVERED;
      } else if (allShippedOrDelivered) {
        parentOrder.status = OrderStatus.SHIPPED;
      } else if (anyShippedOrDelivered) {
        parentOrder.status = OrderStatus.PARTIALLY_SHIPPED;
      } else if (anyProcessing) {
        parentOrder.status = OrderStatus.PROCESSING;
      }
    }

    await this.orderRepo.save(parentOrder);
  }

  /**
   * Release all active inventory reservations for an order (e.g. on cancellation or expiration).
   */
  async releaseReservations(orderId: string): Promise<void> {
    await this.reservationRepo.update(
      { orderId, status: ReservationStatus.ACTIVE },
      { status: ReservationStatus.RELEASED },
    );
  }

  /**
   * Release active inventory reservations for a single store order.
   */
  async releaseStoreOrderReservations(storeOrderId: string): Promise<void> {
    await this.reservationRepo.update(
      { storeOrderId, status: ReservationStatus.ACTIVE },
      { status: ReservationStatus.RELEASED },
    );
  }

  /**
   * Converts active reservations to CONVERTED and permanently deducts stockQuantity
   * from ProductVariant rows within a transaction.
   */
  async convertReservationsAndDeductStock(orderId: string): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const activeReservations = await queryRunner.manager.find(InventoryReservation, {
        where: { orderId, status: ReservationStatus.ACTIVE },
      });

      for (const res of activeReservations) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: res.variantId },
          lock: { mode: 'pessimistic_write' },
        });

        if (variant) {
          variant.stockQuantity = Math.max(0, variant.stockQuantity - res.quantity);
          await queryRunner.manager.save(ProductVariant, variant);
        }

        res.status = ReservationStatus.CONVERTED;
        await queryRunner.manager.save(InventoryReservation, res);
      }

      await queryRunner.commitTransaction();
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Validate store order state machine transitions.
   */
  private assertValidStoreOrderTransition(
    current: StoreOrderStatus,
    target: StoreOrderStatus,
  ): void {
    if (current === target) return;

    if (current === StoreOrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot change status of a cancelled store order');
    }

    if (current === StoreOrderStatus.DELIVERED) {
      throw new BadRequestException('Cannot change status of a delivered store order');
    }

    const allowedTransitions: Record<StoreOrderStatus, StoreOrderStatus[]> = {
      [StoreOrderStatus.PENDING]: [
        StoreOrderStatus.PROCESSING,
        StoreOrderStatus.CANCELLED,
      ],
      [StoreOrderStatus.PROCESSING]: [
        StoreOrderStatus.SHIPPED,
        StoreOrderStatus.CANCELLED,
      ],
      [StoreOrderStatus.SHIPPED]: [
        StoreOrderStatus.DELIVERED,
      ],
      [StoreOrderStatus.DELIVERED]: [],
      [StoreOrderStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[current]?.includes(target)) {
      throw new BadRequestException(
        `Invalid status transition from ${current} to ${target}`,
      );
    }
  }
}
