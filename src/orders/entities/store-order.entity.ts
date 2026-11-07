import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { StoreOrderStatus } from '../enums/store-order-status.enum.js';
import { Order } from './order.entity.js';
import { OrderItem } from './order-item.entity.js';
import { Store } from '../../stores/entities/store.entity.js';

@Entity('store_orders')
export class StoreOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 50 })
  storeOrderNumber: string;

  @Index()
  @Column({ type: 'varchar' })
  orderId: string;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Index()
  @Column({
    type: 'enum',
    enum: StoreOrderStatus,
    default: StoreOrderStatus.PENDING,
  })
  status: StoreOrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'jsonb', nullable: true })
  shippingAddressSnapshot: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  trackingNumber: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true, default: 'Posti' })
  carrier: string | null;

  @Column({ type: 'text', nullable: true })
  trackingUrl: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Order, (o) => o.storeOrders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;

  @OneToMany(() => OrderItem, (item) => item.storeOrder, { cascade: true })
  items: Relation<OrderItem[]>;
}
