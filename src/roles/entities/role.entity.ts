import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';
import { UserRole } from './user-role.entity.js';
import { RolePermission } from '../../permissions/entities/role-permission.entity.js';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  name: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserRole, (ur) => ur.role, { cascade: true })
  userRoles: Relation<UserRole[]>;

  @OneToMany(() => RolePermission, (rp) => rp.role, { cascade: true })
  rolePermissions: Relation<RolePermission[]>;
}
