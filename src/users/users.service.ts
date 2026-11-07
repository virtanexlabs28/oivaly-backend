import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity.js';
import { UserRole } from '../roles/entities/user-role.entity.js';
import { Role } from '../roles/entities/role.entity.js';
import { UserStatus } from './enums/user-status.enum.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';
import { SUPER_ADMIN_ROLE } from '../common/constants/app.constants.js';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string): Promise<User> {
    const existing = await this.userRepo.findOne({
      where: { email: dto.email.toLowerCase() },
    });
    if (existing) throw new ConflictException('A user with this email already exists');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({
      name: dto.name,
      email: dto.email.toLowerCase(),
      passwordHash,
    });
    const saved = await this.userRepo.save(user);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_CREATED,
      resource: 'users',
      resourceId: saved.id,
      metadata: { name: dto.name, email: dto.email },
    });

    return saved;
  }

  async findAll(
    query: UserQueryDto,
  ): Promise<{ data: User[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.userRepo.createQueryBuilder('u');

    if (query.search) {
      qb.where('(u.name ILIKE :q OR u.email ILIKE :q)', {
        q: `%${query.search}%`,
      });
    }
    if (query.status) {
      qb.andWhere('u.status = :status', { status: query.status });
    }

    qb.orderBy('u.createdAt', 'DESC').skip(skip).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async findOne(id: string): Promise<User> {
    const user = await this.userRepo
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.userRoles', 'ur')
      .leftJoinAndSelect('ur.role', 'role')
      .leftJoinAndSelect('role.rolePermissions', 'rp')
      .leftJoinAndSelect('rp.permission', 'perm')
      .where('u.id = :id', { id })
      .getOne();

    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string): Promise<User> {
    const user = await this.findOne(id);

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const conflict = await this.userRepo.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (conflict) throw new ConflictException('Email already in use');
    }

    const updates: Record<string, string> = {};
    if (dto.name) updates['name'] = dto.name;
    if (dto.email) updates['email'] = dto.email.toLowerCase();

    await this.userRepo.update(id, updates);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_UPDATED,
      resource: 'users',
      resourceId: id,
      metadata: dto as unknown as Record<string, unknown>,
    });

    return this.findOne(id);
  }

  async activate(id: string, actorId?: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.userRepo.update(id, { status: UserStatus.ACTIVE });
    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_ACTIVATED,
      resource: 'users',
      resourceId: id,
    });
    return { message: 'User activated' };
  }

  async deactivate(id: string, actorId?: string): Promise<{ message: string }> {
    await this.findOne(id);
    await this.guardLastSuperAdmin(id, 'deactivate');
    await this.userRepo.update(id, { status: UserStatus.INACTIVE });
    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_DEACTIVATED,
      resource: 'users',
      resourceId: id,
    });
    return { message: 'User deactivated' };
  }

  async remove(id: string, actorId?: string): Promise<void> {
    await this.findOne(id);
    await this.guardLastSuperAdmin(id, 'delete');
    await this.userRepo.delete(id);
    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_DELETED,
      resource: 'users',
      resourceId: id,
    });
  }

  async assignRole(userId: string, roleId: string, actorId?: string): Promise<{ message: string }> {
    if (!roleId) throw new BadRequestException('Role ID is required');
    await this.findOne(userId);

    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (!role) throw new NotFoundException('Role not found');

    const existing = await this.userRoleRepo.findOne({ where: { userId, roleId } });
    if (existing) throw new ConflictException('User already has this role');

    await this.userRoleRepo.save(this.userRoleRepo.create({ userId, roleId }));

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_ROLE_ASSIGNED,
      resource: 'users',
      resourceId: userId,
      metadata: { roleId, roleName: role.name },
    });

    return { message: 'Role assigned' };
  }

  async removeRole(userId: string, roleId: string, actorId?: string): Promise<void> {
    if (!roleId) throw new BadRequestException('Role ID is required');
    await this.findOne(userId);

    const role = await this.roleRepo.findOne({ where: { id: roleId } });
    if (role?.name === SUPER_ADMIN_ROLE) {
      await this.guardLastSuperAdmin(userId, 'remove SUPER_ADMIN role from');
    }

    const ur = await this.userRoleRepo.findOne({ where: { userId, roleId } });
    if (!ur) throw new NotFoundException('User does not have this role');

    await this.userRoleRepo.delete(ur.id);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.USER_ROLE_REMOVED,
      resource: 'users',
      resourceId: userId,
      metadata: { roleId },
    });
  }

  // ─── Guards ───────────────────────────────────────────────────────────────

  private async guardLastSuperAdmin(userId: string, action: string): Promise<void> {
    const isSuperAdmin = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'r')
      .where('ur.userId = :userId', { userId })
      .andWhere('r.name = :name', { name: SUPER_ADMIN_ROLE })
      .getCount();

    if (!isSuperAdmin) return;

    const activeSuperAdmins = await this.userRoleRepo
      .createQueryBuilder('ur')
      .innerJoin('ur.role', 'r')
      .innerJoin('ur.user', 'u')
      .where('r.name = :name', { name: SUPER_ADMIN_ROLE })
      .andWhere('u.status = :status', { status: UserStatus.ACTIVE })
      .getCount();

    if (activeSuperAdmins <= 1) {
      throw new ForbiddenException(
        `Cannot ${action} the last active SUPER_ADMIN`,
      );
    }
  }
}
