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
import { SellerTransactionStatus } from '../enums/seller-transaction-status.enum.js';
import { Store } from '../../stores/entities/store.entity.js';
import { Order } from '../../orders/entities/order.entity.js';
import { StoreOrder } from '../../orders/entities/store-order.entity.js';
import { StorePayout } from './store-payout.entity.js';

@Entity('seller_transactions')
export class SellerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Index()
  @Column({ type: 'varchar' })
  orderId: string;

  @Index()
  @Column({ type: 'varchar' })
  storeOrderId: string;

  @Column({ type: 'varchar', length: 50 })
  orderNumber: string;

  @Column({ type: 'varchar', length: 50 })
  storeOrderNumber: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  grossAmount: number;

  @Column({ type: 'decimal', precision: 5, scale: 4, default: 0.1 })
  commissionRate: number; // e.g. 0.10 for 10%

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  commissionAmount: number; // Platform 10% fee

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  netAmount: number; // 90% seller revenue

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Index()
  @Column({
    type: 'enum',
    enum: SellerTransactionStatus,
    default: SellerTransactionStatus.PENDING_CLEARANCE,
  })
  status: SellerTransactionStatus;

  /** Timestamp when 14-day clearance hold period completes and funds become available */
  @Index()
  @Column({ type: 'timestamp with time zone' })
  availableOn: Date;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  payoutId: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  clearedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;

  @ManyToOne(() => StoreOrder, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeOrderId' })
  storeOrder: Relation<StoreOrder>;

  @ManyToOne(() => StorePayout, (p) => p.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'payoutId' })
  payout: Relation<StorePayout> | null;
}
