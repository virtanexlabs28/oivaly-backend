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
import { UserStatus } from '../enums/user-status.enum.js';
import { UserRole } from '../../roles/entities/user-role.entity.js';
import { AuditLog } from '../../audit/entities/audit-log.entity.js';
import { StoreAdmin } from '../../stores/entities/store-admin.entity.js';
import { CustomerAddress } from '../../customer-auth/entities/customer-address.entity.js';
import { ProductReview } from '../../reviews/entities/product-review.entity.js';
import { ReturnRequest } from '../../returns/entities/return-request.entity.js';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Index({ unique: true })
  @Column({ unique: true, length: 255 })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'boolean', default: false })
  isEmailVerified: boolean;

  @Column({ type: 'varchar', nullable: true, select: false })
  emailVerificationToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  emailVerificationExpiresAt: Date | null;

  @Column({ type: 'varchar', nullable: true, select: false })
  passwordResetToken: string | null;

  @Column({ type: 'timestamp', nullable: true })
  passwordResetExpiresAt: Date | null;

  @Column({ nullable: true, type: 'timestamp' })
  lastLoginAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => UserRole, (ur) => ur.user, { cascade: true })
  userRoles: Relation<UserRole[]>;

  @OneToMany(() => AuditLog, (al) => al.actor)
  auditLogs: Relation<AuditLog[]>;

  @OneToMany(() => StoreAdmin, (sa) => sa.user)
  storeAdmins: Relation<StoreAdmin[]>;

  @OneToMany(() => CustomerAddress, (addr) => addr.user, { cascade: true })
  addresses: Relation<CustomerAddress[]>;

  @OneToMany(() => ProductReview, (r) => r.user)
  reviews: Relation<ProductReview[]>;

  @OneToMany(() => ReturnRequest, (rr) => rr.customer)
  returnRequests: Relation<ReturnRequest[]>;
}

