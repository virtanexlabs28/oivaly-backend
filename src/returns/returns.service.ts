import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ReturnRequest } from './entities/return-request.entity.js';
import { ReturnRequestType } from './enums/return-request-type.enum.js';
import { ReturnRequestStatus } from './enums/return-request-status.enum.js';
import { CreateReturnRequestDto } from './dto/create-return-request.dto.js';
import { UpdateReturnStatusDto } from './dto/update-return-status.dto.js';
import { ReturnQueryDto } from './dto/return-query.dto.js';

import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { OrderStatus } from '../orders/enums/order-status.enum.js';
import { Product } from '../products/entities/product.entity.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

export interface PaginatedReturns {
  data: ReturnRequest[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ReturnsService {
  constructor(
    @InjectRepository(ReturnRequest)
    private readonly returnRepo: Repository<ReturnRequest>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // 1. SUBMIT RETURN / WITHDRAWAL / COMPLAINT
  // ──────────────────────────────────────────────────────────────────────────

  async create(
    userId: string | null,
    dto: CreateReturnRequestDto,
    ip?: string,
    userAgent?: string,
  ): Promise<ReturnRequest> {
    const order = await this.orderRepo.findOne({
      where: { id: dto.orderId },
      relations: {
        customer: true,
        storeOrders: { items: true },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found`);
    }

    // Ownership check: If authenticated, verify order ownership. If guest, verify email.
    if (userId) {
      if (order.customerId !== userId) {
        throw new ForbiddenException('You can only submit returns for your own orders');
      }
    } else {
      if (!order.isGuest || order.guestEmail?.toLowerCase() !== dto.guestEmail?.toLowerCase()) {
        throw new ForbiddenException(
          'Email address does not match the guest order record',
        );
      }
    }

    // Order status validation
    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.PENDING) {
      throw new BadRequestException(
        `Returns cannot be filed for orders in ${order.status} status`,
      );
    }

    // 14-Day Statutory Consumer Withdrawal Rule (Finnish Consumer Protection Act)
    if (dto.type === ReturnRequestType.WITHDRAWAL) {
      const orderDate = new Date(order.createdAt).getTime();
      const now = Date.now();
      const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);

      if (diffDays > 14) {
        throw new BadRequestException(
          'The 14-day statutory consumer withdrawal window has expired for this order.',
        );
      }
    }

    // Validate returned items against order items
    const allOrderItems = order.storeOrders.flatMap((so) => so.items);
    const orderItemMap = new Map<string, OrderItem>();
    for (const oi of allOrderItems) {
      orderItemMap.set(oi.id, oi);
    }

    const itemsSummary: Array<{
      orderItemId: string;
      productName: string;
      sku?: string | null;
      quantity: number;
      reason?: string;
    }> = [];

    let targetStoreId: string | null = null;
    let targetStoreOrderId: string | null = dto.storeOrderId ?? null;

    for (const itemDto of dto.items) {
      const orderItem = orderItemMap.get(itemDto.orderItemId);
      if (!orderItem) {
        throw new BadRequestException(
          `OrderItem ${itemDto.orderItemId} does not belong to this order`,
        );
      }

      if (itemDto.quantity > orderItem.quantity) {
        throw new BadRequestException(
          `Return quantity (${itemDto.quantity}) exceeds ordered quantity (${orderItem.quantity}) for "${orderItem.productNameSnapshot}"`,
        );
      }

      // Check product-level return eligibility
      if (orderItem.productId) {
        const product = await this.productRepo.findOne({
          where: { id: orderItem.productId },
        });
        if (product && !product.isReturnEligible && dto.type === ReturnRequestType.WITHDRAWAL) {
          throw new BadRequestException(
            `Product "${product.name}" is marked as non-returnable (e.g. hygiene/customized exemption).`,
          );
        }
      }


      targetStoreId = orderItem.storeId;
      targetStoreOrderId = orderItem.storeOrderId;

      itemsSummary.push({
        orderItemId: orderItem.id,
        productName: orderItem.productNameSnapshot,
        sku: orderItem.skuSnapshot,
        quantity: itemDto.quantity,
        reason: itemDto.reason ?? dto.reason,
      });
    }

    if (!targetStoreId) {
      throw new BadRequestException('Could not determine store association for returned items');
    }

    const customerEmail =
      order.customer?.email || order.guestEmail || dto.guestEmail || 'customer@marketplace.fi';

    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const requestNumber = `RET-${timestamp}-${randomSuffix}`;

    const returnRequest = this.returnRepo.create({
      requestNumber,
      type: dto.type,
      status: ReturnRequestStatus.PENDING,
      orderId: order.id,
      storeOrderId: targetStoreOrderId,
      storeId: targetStoreId,
      customerId: userId,
      customerEmail,
      reason: dto.reason,
      details: dto.details ?? null,
      items: itemsSummary,
      acknowledgementSent: true,
      submittedAt: new Date(),
    });

    const saved = await this.returnRepo.save(returnRequest);

    // Automated durable-medium email acknowledgement
    await this.notificationsService.sendWithdrawalReceiptEmail(
      customerEmail,
      saved.requestNumber,
      order.orderNumber,
      saved.type,
      saved.items.length,
    );

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.RETURN_REQUEST_CREATED,
      resource: 'return_request',
      resourceId: saved.id,
      ipAddress: ip,
      userAgent,
      metadata: {
        requestNumber: saved.requestNumber,
        type: saved.type,
        orderId: order.id,
        orderNumber: order.orderNumber,
        itemsCount: saved.items.length,
      },
    });

    return saved;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. CUSTOMER RETURN QUERIES
  // ──────────────────────────────────────────────────────────────────────────

  async findAllForCustomer(
    userId: string,
    query: ReturnQueryDto,
  ): Promise<PaginatedReturns> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.returnRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.order', 'o')
      .leftJoinAndSelect('r.store', 's')
      .where('r.customerId = :userId', { userId })
      .orderBy('r.submittedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.type) qb.andWhere('r.type = :type', { type: query.type });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOneForCustomer(id: string, userId: string): Promise<ReturnRequest> {
    const req = await this.returnRepo.findOne({
      where: { id, customerId: userId },
      relations: { order: true, store: true },
    });
    if (!req) {
      throw new NotFoundException(`Return request with ID ${id} not found`);
    }
    return req;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STORE ADMIN RETURN MANAGEMENT (TENANT-ISOLATED)
  // ──────────────────────────────────────────────────────────────────────────

  async findAllForStore(
    storeId: string,
    query: ReturnQueryDto,
  ): Promise<PaginatedReturns> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.returnRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.order', 'o')
      .where('r.storeId = :storeId', { storeId })
      .orderBy('r.submittedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.type) qb.andWhere('r.type = :type', { type: query.type });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOneForStore(id: string, storeId: string): Promise<ReturnRequest> {
    const req = await this.returnRepo.findOne({
      where: { id, storeId },
      relations: { order: true },
    });
    if (!req) {
      throw new NotFoundException(`Return request with ID ${id} not found for this store`);
    }
    return req;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PLATFORM ADMIN RETURN MANAGEMENT
  // ──────────────────────────────────────────────────────────────────────────

  async findAllAdmin(query: ReturnQueryDto): Promise<PaginatedReturns> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.returnRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.order', 'o')
      .leftJoinAndSelect('r.store', 's')
      .leftJoinAndSelect('r.customer', 'c')
      .orderBy('r.submittedAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.type) qb.andWhere('r.type = :type', { type: query.type });
    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.storeId) qb.andWhere('r.storeId = :storeId', { storeId: query.storeId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOneAdmin(id: string): Promise<ReturnRequest> {
    const req = await this.returnRepo.findOne({
      where: { id },
      relations: { order: true, store: true, customer: true },
    });
    if (!req) {
      throw new NotFoundException(`Return request with ID ${id} not found`);
    }
    return req;
  }

  async updateStatus(
    id: string,
    dto: UpdateReturnStatusDto,
    actorId?: string,
  ): Promise<ReturnRequest> {
    const req = await this.findOneAdmin(id);

    req.status = dto.status;
    if (dto.adminNotes) req.adminNotes = dto.adminNotes;
    if (dto.rejectionReason) req.rejectionReason = dto.rejectionReason;

    if (
      dto.status === ReturnRequestStatus.APPROVED ||
      dto.status === ReturnRequestStatus.COMPLETED ||
      dto.status === ReturnRequestStatus.REJECTED
    ) {
      req.resolvedAt = new Date();
    }

    const saved = await this.returnRepo.save(req);

    // Notify customer
    await this.notificationsService.sendReturnStatusEmail(
      saved.customerEmail,
      saved.requestNumber,
      saved.status,
      dto.adminNotes || dto.rejectionReason,
    );

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.RETURN_REQUEST_UPDATED,
      resource: 'return_request',
      resourceId: saved.id,
      metadata: {
        requestNumber: saved.requestNumber,
        newStatus: saved.status,
        rejectionReason: dto.rejectionReason,
      },
    });

    return saved;
  }
}
