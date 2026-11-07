import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { ReturnRequestType } from '../enums/return-request-type.enum.js';
import { ReturnRequestStatus } from '../enums/return-request-status.enum.js';
import { Order } from '../../orders/entities/order.entity.js';
import { StoreOrder } from '../../orders/entities/store-order.entity.js';
import { Store } from '../../stores/entities/store.entity.js';
import { User } from '../../users/entities/user.entity.js';

@Entity('return_requests')
export class ReturnRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 50 })
  requestNumber: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ReturnRequestType,
    default: ReturnRequestType.WITHDRAWAL,
  })
  type: ReturnRequestType;

  @Index()
  @Column({
    type: 'enum',
    enum: ReturnRequestStatus,
    default: ReturnRequestStatus.PENDING,
  })
  status: ReturnRequestStatus;

  @Index()
  @Column({ type: 'varchar' })
  orderId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  storeOrderId: string | null;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({ type: 'varchar', length: 255 })
  reason: string;

  @Column({ type: 'text', nullable: true })
  details: string | null;

  /** Items being returned / complained about with quantity & SKU */
  @Column({ type: 'jsonb' })
  items: Array<{
    orderItemId: string;
    productName: string;
    sku?: string | null;
    quantity: number;
    reason?: string;
  }>;

  @Column({ type: 'text', nullable: true })
  rejectionReason: string | null;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @Column({ type: 'boolean', default: false })
  acknowledgementSent: boolean;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;

  @ManyToOne(() => StoreOrder, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storeOrderId' })
  storeOrder: Relation<StoreOrder> | null;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;

  @ManyToOne(() => User, (u) => u.returnRequests, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customerId' })
  customer: Relation<User> | null;
}
