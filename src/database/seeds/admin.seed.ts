import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../../users/entities/user.entity.js';
import { Role } from '../../roles/entities/role.entity.js';
import { Permission } from '../../permissions/entities/permission.entity.js';
import { UserRole } from '../../roles/entities/user-role.entity.js';
import { RolePermission } from '../../permissions/entities/role-permission.entity.js';
import {
  SUPER_ADMIN_ROLE,
  STORE_ADMIN_ROLE,
  CUSTOMER_ROLE,
  DEFAULT_PERMISSIONS,
  STORE_ADMIN_DEFAULT_PERMISSIONS,
} from '../../common/constants/app.constants.js';

@Injectable()
export class AdminSeed implements OnApplicationBootstrap {
  private readonly logger = new Logger(AdminSeed.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(Permission) private permRepo: Repository<Permission>,
    @InjectRepository(UserRole) private userRoleRepo: Repository<UserRole>,
    @InjectRepository(RolePermission) private rpRepo: Repository<RolePermission>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedPermissions();
    await this.seedSuperAdminRole();
    await this.seedStoreAdminRole();
    await this.seedCustomerRole();
    await this.seedSuperAdminUser();
  }


  private async seedPermissions() {
    for (const key of DEFAULT_PERMISSIONS) {
      const exists = await this.permRepo.findOne({ where: { key } });
      if (!exists) {
        const [resource, action] = key.split('.');
        await this.permRepo.save(
          this.permRepo.create({ key, resource: resource!, action: action! }),
        );
        this.logger.log(`Seeded permission: ${key}`);
      }
    }
  }

  private async seedSuperAdminRole() {
    let role = await this.roleRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.rolePermissions', 'rp')
      .where('r.name = :name', { name: SUPER_ADMIN_ROLE })
      .getOne();

    if (!role) {
      role = await this.roleRepo.save(
        this.roleRepo.create({
          name: SUPER_ADMIN_ROLE,
          description: 'Full platform access — cannot be deleted or renamed',
        }),
      );
      this.logger.log('Seeded SUPER_ADMIN role');
    }

    // Assign ALL permissions to SUPER_ADMIN
    const allPermissions = await this.permRepo.find();
    for (const perm of allPermissions) {
      const exists = await this.rpRepo.findOne({
        where: { roleId: role.id, permissionId: perm.id },
      });
      if (!exists) {
        await this.rpRepo.save(
          this.rpRepo.create({ roleId: role.id, permissionId: perm.id }),
        );
      }
    }
  }

  private async seedStoreAdminRole() {
    let role = await this.roleRepo
      .createQueryBuilder('r')
      .where('r.name = :name', { name: STORE_ADMIN_ROLE })
      .getOne();

    if (!role) {
      role = await this.roleRepo.save(
        this.roleRepo.create({
          name: STORE_ADMIN_ROLE,
          description: 'Store Administrator with store-level access',
        }),
      );
      this.logger.log('Seeded STORE_ADMIN role');
    }

    // Assign default STORE_ADMIN permissions
    for (const key of STORE_ADMIN_DEFAULT_PERMISSIONS) {
      const perm = await this.permRepo.findOne({ where: { key } });
      if (perm) {
        const exists = await this.rpRepo.findOne({
          where: { roleId: role.id, permissionId: perm.id },
        });
        if (!exists) {
          await this.rpRepo.save(
            this.rpRepo.create({ roleId: role.id, permissionId: perm.id }),
          );
        }
      }
    }
  }

  private async seedCustomerRole() {
    let role = await this.roleRepo
      .createQueryBuilder('r')
      .where('r.name = :name', { name: CUSTOMER_ROLE })
      .getOne();

    if (!role) {
      role = await this.roleRepo.save(
        this.roleRepo.create({
          name: CUSTOMER_ROLE,
          description: 'Default role for registered marketplace retail customers',
        }),
      );
      this.logger.log('Seeded CUSTOMER role');
    }
  }

  private async seedSuperAdminUser() {

    const adminEmail = process.env['ADMIN_EMAIL'] ?? 'admin@platform.com';
    const adminPassword = process.env['ADMIN_PASSWORD'] ?? 'Admin@123456';
    const adminName = process.env['ADMIN_NAME'] ?? 'Platform Admin';

    let user = await this.userRepo.findOne({ where: { email: adminEmail } });

    if (!user) {
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      user = await this.userRepo.save(
        this.userRepo.create({ name: adminName, email: adminEmail, passwordHash }),
      );
      this.logger.log(`Seeded admin user: ${adminEmail}`);
      this.logger.warn(`Default password is "${adminPassword}" — change it immediately!`);
    }

    const role = await this.roleRepo.findOne({ where: { name: SUPER_ADMIN_ROLE } });
    if (role) {
      const exists = await this.userRoleRepo.findOne({
        where: { userId: user.id, roleId: role.id },
      });
      if (!exists) {
        await this.userRoleRepo.save(
          this.userRoleRepo.create({ userId: user.id, roleId: role.id }),
        );
        this.logger.log('Assigned SUPER_ADMIN role to admin user');
      }
    }
  }
}
