import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Store } from './entities/store.entity.js';
import { StoreAdmin } from './entities/store-admin.entity.js';
import { StoreStatus } from './enums/store-status.enum.js';
import { StoreQueryDto } from './dto/store-query.dto.js';
import { AdminUpdateStoreDto, UpdateStoreStatusDto } from './dto/admin-update-store.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { StoreEventsService } from './events/store-events.service.js';

@Injectable()
export class StoresService {
  constructor(
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(StoreAdmin) private storeAdminRepo: Repository<StoreAdmin>,
    private auditService: AuditService,
    private storeEventsService: StoreEventsService,
  ) {}

  /**
   * Find all stores with pagination, status filtering, and search
   */
  async findAll(query: StoreQueryDto): Promise<{
    data: Store[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.storeRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.storeAdmins', 'sa')
      .leftJoinAndSelect('sa.user', 'u')
      .orderBy('s.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('s.status = :status', { status: query.status });
    }

    if (query.search) {
      qb.andWhere(
        '(s.name ILIKE :search OR s.legalBusinessName ILIKE :search OR s.businessId ILIKE :search OR s.contactName ILIKE :search)',
        { search: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find a single store with its administrators
   */
  async findOne(id: string): Promise<Store> {
    const store = await this.storeRepo
      .createQueryBuilder('s')
      .leftJoinAndSelect('s.storeAdmins', 'sa')
      .leftJoinAndSelect('sa.user', 'u')
      .where('s.id = :id', { id })
      .getOne();

    if (!store) {
      throw new NotFoundException(`Store with ID "${id}" not found`);
    }

    return store;
  }

  /**
   * Platform Admin: Approve Store
   */
  async approve(id: string, actorId?: string): Promise<Store> {
    const store = await this.findOne(id);

    if (store.status === StoreStatus.APPROVED) {
      throw new BadRequestException('Store is already approved');
    }

    if (store.status === StoreStatus.ACTIVE) {
      throw new BadRequestException('Store is already active');
    }

    const previousStatus = store.status;
    store.status = StoreStatus.APPROVED;
    store.rejectionReason = null;
    const updated = await this.storeRepo.save(store);

    const recipientEmail = this.resolvePrimaryEmail(store);
    this.storeEventsService.emitStoreApproved(updated, recipientEmail);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_APPROVED,
      resource: 'stores',
      resourceId: store.id,
      metadata: {
        storeName: store.name,
        previousStatus,
        newStatus: StoreStatus.APPROVED,
      },
    });

    return updated;
  }

  /**
   * Platform Admin: Reject Store
   */
  async reject(id: string, reason: string, actorId?: string): Promise<Store> {
    const store = await this.findOne(id);

    if (store.status === StoreStatus.REJECTED) {
      throw new BadRequestException('Store is already rejected');
    }

    const previousStatus = store.status;
    store.status = StoreStatus.REJECTED;
    store.rejectionReason = reason;
    const updated = await this.storeRepo.save(store);

    const recipientEmail = this.resolvePrimaryEmail(store);
    this.storeEventsService.emitStoreRejected(updated, reason, recipientEmail);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_REJECTED,
      resource: 'stores',
      resourceId: store.id,
      metadata: {
        storeName: store.name,
        reason,
        previousStatus,
        newStatus: StoreStatus.REJECTED,
      },
    });

    return updated;
  }

  /**
   * Platform Admin: Activate Store (from APPROVED or reactivate from SUSPENDED)
   */
  async activate(id: string, actorId?: string): Promise<Store> {
    const store = await this.findOne(id);

    if (store.status === StoreStatus.ACTIVE) {
      throw new BadRequestException('Store is already active');
    }

    if (store.status === StoreStatus.UNDER_REVIEW || store.status === StoreStatus.PENDING) {
      throw new BadRequestException(
        'Store must be approved before it can be activated. Please approve the store first.',
      );
    }

    const previousStatus = store.status;
    const isReactivation = previousStatus === StoreStatus.SUSPENDED;

    store.status = StoreStatus.ACTIVE;
    if (isReactivation) {
      store.suspensionReason = null;
    }
    const updated = await this.storeRepo.save(store);

    const recipientEmail = this.resolvePrimaryEmail(store);
    if (isReactivation) {
      this.storeEventsService.emitStoreReactivated(updated, recipientEmail);
    } else {
      this.storeEventsService.emitStoreActivated(updated, recipientEmail);
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: isReactivation
        ? AuditAction.STORE_REACTIVATED
        : AuditAction.STORE_ACTIVATED,
      resource: 'stores',
      resourceId: store.id,
      metadata: {
        storeName: store.name,
        previousStatus,
        newStatus: StoreStatus.ACTIVE,
      },
    });

    return updated;
  }

  /**
   * Platform Admin: Suspend Store
   */
  async suspend(id: string, reason: string, actorId?: string): Promise<Store> {
    const store = await this.findOne(id);

    if (store.status === StoreStatus.SUSPENDED) {
      throw new BadRequestException('Store is already suspended');
    }

    const previousStatus = store.status;
    store.status = StoreStatus.SUSPENDED;
    store.suspensionReason = reason;
    const updated = await this.storeRepo.save(store);

    const recipientEmail = this.resolvePrimaryEmail(store);
    this.storeEventsService.emitStoreSuspended(updated, reason, recipientEmail);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_SUSPENDED,
      resource: 'stores',
      resourceId: store.id,
      metadata: {
        storeName: store.name,
        reason,
        previousStatus,
        newStatus: StoreStatus.SUSPENDED,
      },
    });

    return updated;
  }

  /**
   * Platform Admin: Add a user as a store admin
   */
  async addStoreAdmin(storeId: string, userId: string, actorId?: string): Promise<StoreAdmin> {
    await this.findOne(storeId); // validates store exists

    const existing = await this.storeAdminRepo.findOne({ where: { storeId, userId } });
    if (existing) {
      throw new BadRequestException(`User "${userId}" is already an admin of this store`);
    }

    const storeAdmin = this.storeAdminRepo.create({ storeId, userId });
    const saved = await this.storeAdminRepo.save(storeAdmin);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_ADMIN_ADDED,
      resource: 'store_admins',
      resourceId: saved.id,
      metadata: { storeId, userId },
    });

    return saved;
  }

  /**
   * Platform Admin: Remove a store admin
   */
  async removeStoreAdmin(storeId: string, adminId: string, actorId?: string): Promise<{ message: string }> {
    await this.findOne(storeId);

    const storeAdmin = await this.storeAdminRepo.findOne({ where: { id: adminId, storeId } });
    if (!storeAdmin) {
      throw new NotFoundException(`Store admin "${adminId}" not found for this store`);
    }

    await this.storeAdminRepo.remove(storeAdmin);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_ADMIN_REMOVED,
      resource: 'store_admins',
      resourceId: adminId,
      metadata: { storeId },
    });

    return { message: 'Store admin removed successfully' };
  }

  /**
   * Platform Admin: Full update of store data & optional status
   */
  async update(id: string, dto: AdminUpdateStoreDto, actorId?: string): Promise<Store> {
    const store = await this.findOne(id);
    const previousStatus = store.status;

    if (dto.name && dto.name.trim() !== store.name) {
      const existing = await this.storeRepo.findOne({
        where: { name: dto.name.trim() },
      });
      if (existing && existing.id !== store.id) {
        throw new BadRequestException(`Store name "${dto.name}" is already taken`);
      }
      store.name = dto.name.trim();
    }

    if (dto.legalBusinessName !== undefined) store.legalBusinessName = dto.legalBusinessName.trim();
    if (dto.businessId !== undefined) store.businessId = dto.businessId.trim();
    if (dto.vatId !== undefined) store.vatId = dto.vatId ? dto.vatId.trim() : null;
    if (dto.address !== undefined) store.address = dto.address.trim();
    if (dto.phone !== undefined) store.phone = dto.phone.trim();
    if (dto.contactName !== undefined) store.contactName = dto.contactName.trim();
    if (dto.currency !== undefined) store.currency = dto.currency.trim();
    if (dto.timezone !== undefined) store.timezone = dto.timezone.trim();
    if (dto.description !== undefined) store.description = dto.description ? dto.description.trim() : null;
    if (dto.logoUrl !== undefined) store.logoUrl = dto.logoUrl ? dto.logoUrl.trim() : null;
    if (dto.websiteUrl !== undefined) store.websiteUrl = dto.websiteUrl ? dto.websiteUrl.trim() : null;
    if (dto.autoSubmitProducts !== undefined) store.autoSubmitProducts = dto.autoSubmitProducts;
    if (dto.defaultLowStockThreshold !== undefined) store.defaultLowStockThreshold = dto.defaultLowStockThreshold;

    let statusChanged = false;
    if (dto.status !== undefined && dto.status !== previousStatus) {
      statusChanged = true;
      store.status = dto.status;
      if (dto.status === StoreStatus.APPROVED) {
        store.rejectionReason = null;
      } else if (dto.status === StoreStatus.ACTIVE) {
        store.suspensionReason = null;
      } else if (dto.status === StoreStatus.SUSPENDED) {
        store.suspensionReason = dto.suspensionReason || 'Suspended by platform administrator';
      } else if (dto.status === StoreStatus.REJECTED) {
        store.rejectionReason = dto.rejectionReason || 'Rejected by platform administrator';
      }
    }

    const updated = await this.storeRepo.save(store);
    const recipientEmail = this.resolvePrimaryEmail(updated);

    if (statusChanged) {
      if (updated.status === StoreStatus.APPROVED) {
        this.storeEventsService.emitStoreApproved(updated, recipientEmail);
      } else if (updated.status === StoreStatus.ACTIVE) {
        if (previousStatus === StoreStatus.SUSPENDED) {
          this.storeEventsService.emitStoreReactivated(updated, recipientEmail);
        } else {
          this.storeEventsService.emitStoreActivated(updated, recipientEmail);
        }
      } else if (updated.status === StoreStatus.SUSPENDED) {
        this.storeEventsService.emitStoreSuspended(updated, store.suspensionReason || '', recipientEmail);
      } else if (updated.status === StoreStatus.REJECTED) {
        this.storeEventsService.emitStoreRejected(updated, store.rejectionReason || '', recipientEmail);
      }
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.STORE_UPDATED,
      resource: 'stores',
      resourceId: updated.id,
      metadata: {
        storeName: updated.name,
        previousStatus,
        newStatus: updated.status,
        updatedFields: Object.keys(dto),
      },
    });

    return updated;
  }

  /**
   * Platform Admin: Direct status transition to any status
   */
  async updateStatus(id: string, dto: UpdateStoreStatusDto, actorId?: string): Promise<Store> {
    return this.update(
      id,
      {
        status: dto.status,
        rejectionReason: dto.status === StoreStatus.REJECTED ? dto.reason : undefined,
        suspensionReason: dto.status === StoreStatus.SUSPENDED ? dto.reason : undefined,
      },
      actorId,
    );
  }

  private resolvePrimaryEmail(store: Store): string {
    const firstAdmin = store.storeAdmins?.[0]?.user;
    return firstAdmin?.email ?? 'store@platform.com';
  }
}
