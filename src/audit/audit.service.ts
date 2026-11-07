import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity.js';

interface LogInput {
  actorUserId?: string | null;
  action: AuditAction;
  resource: string;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog) private auditRepo: Repository<AuditLog>,
  ) {}

  async log(input: LogInput): Promise<void> {
    const record = this.auditRepo.create({
      actorUserId: input.actorUserId ?? null,
      action: input.action,
      resource: input.resource,
      resourceId: input.resourceId ?? null,
      metadata: input.metadata ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
    });
    await this.auditRepo.save(record);
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    action?: AuditAction;
    resource?: string;
    actorUserId?: string;
  }): Promise<{ data: AuditLog[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.auditRepo.createQueryBuilder('al')
      .leftJoinAndSelect('al.actor', 'actor')
      .orderBy('al.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.action) qb.andWhere('al.action = :action', { action: query.action });
    if (query.resource) qb.andWhere('al.resource = :resource', { resource: query.resource });
    if (query.actorUserId) qb.andWhere('al.actorUserId = :uid', { uid: query.actorUserId });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<AuditLog | null> {
    return this.auditRepo.findOne({
      where: { id },
      relations: { actor: true },
    });
  }
}
