import {
  Entity,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  Index,
  Column,
  type Relation,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity.js';
import { Permission } from './permission.entity.js';

@Entity('role_permissions')
@Index(['roleId', 'permissionId'], { unique: true })
export class RolePermission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar' })
  roleId: string;

  @Column({ type: 'varchar' })
  permissionId: string;

  @ManyToOne(() => Role, (r) => r.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId' })
  role: Relation<Role>;

  @ManyToOne(() => Permission, (p) => p.rolePermissions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permissionId' })
  permission: Relation<Permission>;

  @CreateDateColumn()
  assignedAt: Date;
}
