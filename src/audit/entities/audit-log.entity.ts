import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { User } from '../../users/entities/user.entity.js';

export enum AuditAction {
  // Auth
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  // Users
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_DELETED = 'USER_DELETED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_ROLE_ASSIGNED = 'USER_ROLE_ASSIGNED',
  USER_ROLE_REMOVED = 'USER_ROLE_REMOVED',
  // Roles
  ROLE_CREATED = 'ROLE_CREATED',
  ROLE_UPDATED = 'ROLE_UPDATED',
  ROLE_DELETED = 'ROLE_DELETED',
  ROLE_PERMISSION_ASSIGNED = 'ROLE_PERMISSION_ASSIGNED',
  ROLE_PERMISSION_REMOVED = 'ROLE_PERMISSION_REMOVED',
  // Permissions
  PERMISSION_CREATED = 'PERMISSION_CREATED',
  PERMISSION_UPDATED = 'PERMISSION_UPDATED',
  PERMISSION_DELETED = 'PERMISSION_DELETED',
  // Stores
  STORE_APPLICATION_SUBMITTED = 'STORE_APPLICATION_SUBMITTED',
  STORE_APPROVED = 'STORE_APPROVED',
  STORE_REJECTED = 'STORE_REJECTED',
  STORE_ACTIVATED = 'STORE_ACTIVATED',
  STORE_SUSPENDED = 'STORE_SUSPENDED',
  STORE_REACTIVATED = 'STORE_REACTIVATED',
  STORE_ADMIN_LOGIN = 'STORE_ADMIN_LOGIN',
  STORE_ADMIN_ADDED = 'STORE_ADMIN_ADDED',
  STORE_ADMIN_REMOVED = 'STORE_ADMIN_REMOVED',
  STORE_UPDATED = 'STORE_UPDATED',
  // Products
  PRODUCT_CREATED = 'PRODUCT_CREATED',
  PRODUCT_UPDATED = 'PRODUCT_UPDATED',
  PRODUCT_DELETED = 'PRODUCT_DELETED',
  PRODUCT_ARCHIVED = 'PRODUCT_ARCHIVED',
  PRODUCT_SUBMITTED = 'PRODUCT_SUBMITTED',
  PRODUCT_APPROVED = 'PRODUCT_APPROVED',
  PRODUCT_REJECTED = 'PRODUCT_REJECTED',
  PRODUCT_PUBLISHED = 'PRODUCT_PUBLISHED',
  // Inventory
  INVENTORY_UPDATED = 'INVENTORY_UPDATED',
  INVENTORY_ADJUSTED = 'INVENTORY_ADJUSTED',
  // Cart
  CART_CREATED = 'CART_CREATED',
  CART_ITEM_ADDED = 'CART_ITEM_ADDED',
  CART_CLEARED = 'CART_CLEARED',
  // Orders
  ORDER_CREATED = 'ORDER_CREATED',
  GUEST_ORDER_CREATED = 'GUEST_ORDER_CREATED',
  ORDER_CANCELLED = 'ORDER_CANCELLED',
  ORDER_STATUS_CHANGED = 'ORDER_STATUS_CHANGED',
  STORE_ORDER_STATUS_CHANGED = 'STORE_ORDER_STATUS_CHANGED',
  // Customer & Addresses
  CUSTOMER_REGISTERED = 'CUSTOMER_REGISTERED',
  CUSTOMER_EMAIL_VERIFIED = 'CUSTOMER_EMAIL_VERIFIED',
  CUSTOMER_PASSWORD_RESET = 'CUSTOMER_PASSWORD_RESET',
  CUSTOMER_PROFILE_UPDATED = 'CUSTOMER_PROFILE_UPDATED',
  CUSTOMER_ADDRESS_CREATED = 'CUSTOMER_ADDRESS_CREATED',
  CUSTOMER_ADDRESS_UPDATED = 'CUSTOMER_ADDRESS_UPDATED',
  CUSTOMER_ADDRESS_DELETED = 'CUSTOMER_ADDRESS_DELETED',
  // Returns & Withdrawals
  RETURN_REQUEST_CREATED = 'RETURN_REQUEST_CREATED',
  RETURN_REQUEST_UPDATED = 'RETURN_REQUEST_UPDATED',
  // Reviews
  REVIEW_CREATED = 'REVIEW_CREATED',
  REVIEW_UPDATED = 'REVIEW_UPDATED',
  REVIEW_MODERATED = 'REVIEW_MODERATED',
  REVIEW_DELETED = 'REVIEW_DELETED',
}


@Entity('audit_logs')
export class AuditLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', nullable: true })
  actorUserId: string | null;

  @Index()
  @Column({ type: 'enum', enum: AuditAction })
  action: AuditAction;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  resource: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  resourceId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  ipAddress: string | null;

  @Column({ type: 'varchar', nullable: true, length: 512 })
  userAgent: string | null;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => User, (u) => u.auditLogs, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'actorUserId' })
  actor: Relation<User> | null;
}
