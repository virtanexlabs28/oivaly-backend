import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    private auditService: AuditService,
  ) {}

  async create(dto: CreatePermissionDto, actorId?: string): Promise<Permission> {
    const existing = await this.permRepo.findOne({ where: { key: dto.key } });
    if (existing) throw new ConflictException('Permission key already exists');

    const perm = this.permRepo.create(dto);
    const saved = await this.permRepo.save(perm);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PERMISSION_CREATED,
      resource: 'permissions',
      resourceId: saved.id,
      metadata: { key: dto.key },
    });

    return saved;
  }

  async findAll(): Promise<Permission[]> {
    return this.permRepo.find({ order: { resource: 'ASC', action: 'ASC' } });
  }

  async findOne(id: string): Promise<Permission> {
    const perm = await this.permRepo.findOne({ where: { id } });
    if (!perm) throw new NotFoundException('Permission not found');
    return perm;
  }

  async update(id: string, dto: UpdatePermissionDto, actorId?: string): Promise<Permission> {
    await this.findOne(id);
    await this.permRepo.update(id, dto);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PERMISSION_UPDATED,
      resource: 'permissions',
      resourceId: id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return this.findOne(id);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const perm = await this.findOne(id);
    await this.permRepo.delete(id);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PERMISSION_DELETED,
      resource: 'permissions',
      resourceId: id,
      metadata: { key: perm.key },
    });
  }
}
