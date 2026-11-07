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
import { RolePermission } from './role-permission.entity.js';

@Entity('permissions')
export class Permission {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /**
   * Unique permission key in format: resource.action
   * Examples: users.read, products.create, orders.delete
   */
  @Index({ unique: true })
  @Column({ unique: true, length: 100 })
  key: string;

  @Column({ length: 100 })
  resource: string;

  @Column({ length: 100 })
  action: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  description: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => RolePermission, (rp) => rp.permission, { cascade: true })
  rolePermissions: Relation<RolePermission[]>;
}
