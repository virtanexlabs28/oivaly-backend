import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from './entities/role.entity.js';
import { UserRole } from './entities/user-role.entity.js';
import { RolePermission } from '../permissions/entities/role-permission.entity.js';
import { Permission } from '../permissions/entities/permission.entity.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { SUPER_ADMIN_ROLE } from '../common/constants/app.constants.js';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private rpRepo: Repository<RolePermission>,
    @InjectRepository(Permission) private permissionRepo: Repository<Permission>,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateRoleDto, actorId?: string): Promise<Role> {
    const existing = await this.roleRepo.findOne({ where: { name: dto.name } });
    if (existing) throw new ConflictException('A role with this name already exists');

    const role = this.roleRepo.create(dto);
    const saved = await this.roleRepo.save(role);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.ROLE_CREATED,
      resource: 'roles',
      resourceId: saved.id,
      metadata: { name: dto.name },
    });

    return saved;
  }

  async findAll(): Promise<Role[]> {
    return this.roleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.rolePermissions', 'rp')
      .leftJoinAndSelect('rp.permission', 'perm')
      .orderBy('r.createdAt', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.rolePermissions', 'rp')
      .leftJoinAndSelect('rp.permission', 'perm')
      .where('r.id = :id', { id })
      .getOne();

    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto, actorId?: string): Promise<Role> {
    const role = await this.findOne(id);

    if (role.name === SUPER_ADMIN_ROLE && dto.name && dto.name !== SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Cannot rename the SUPER_ADMIN role');
    }

    if (dto.name && dto.name !== role.name) {
      const conflict = await this.roleRepo.findOne({ where: { name: dto.name } });
      if (conflict) throw new ConflictException('Role name already in use');
    }

    await this.roleRepo.update(id, dto as Record<string, unknown>);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.ROLE_UPDATED,
      resource: 'roles',
      resourceId: id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return this.findOne(id);
  }

  async remove(id: string, actorId?: string): Promise<void> {
    const role = await this.findOne(id);

    if (role.name === SUPER_ADMIN_ROLE) {
      throw new ForbiddenException('Cannot delete the SUPER_ADMIN role');
    }

    await this.roleRepo.delete(id);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.ROLE_DELETED,
      resource: 'roles',
      resourceId: id,
      metadata: { name: role.name },
    });
  }

  async assignPermission(roleId: string, permissionId: string, actorId?: string): Promise<{ message: string }> {
    if (!permissionId) throw new BadRequestException('Permission ID is required');
    await this.findOne(roleId);

    const permission = await this.permissionRepo.findOne({ where: { id: permissionId } });
    if (!permission) throw new NotFoundException('Permission not found');

    const existing = await this.rpRepo.findOne({ where: { roleId, permissionId } });
    if (existing) throw new ConflictException('Role already has this permission');

    await this.rpRepo.save(this.rpRepo.create({ roleId, permissionId }));

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.ROLE_PERMISSION_ASSIGNED,
      resource: 'roles',
      resourceId: roleId,
      metadata: { permissionId, permissionKey: permission.key },
    });

    return { message: 'Permission assigned' };
  }

  async removePermission(roleId: string, permissionId: string, actorId?: string): Promise<void> {
    if (!permissionId) throw new BadRequestException('Permission ID is required');
    const rp = await this.rpRepo.findOne({ where: { roleId, permissionId } });
    if (!rp) throw new NotFoundException('Role does not have this permission');

    await this.rpRepo.delete(rp.id);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.ROLE_PERMISSION_REMOVED,
      resource: 'roles',
      resourceId: roleId,
      metadata: { permissionId },
    });
  }
}
