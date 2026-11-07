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
import { OrderStatus } from '../enums/order-status.enum.js';
import { User } from '../../users/entities/user.entity.js';
import { StoreOrder } from './store-order.entity.js';
import { InventoryReservation } from './inventory-reservation.entity.js';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 50 })
  orderNumber: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'boolean', default: false })
  isGuest: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true })
  guestEmail: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  guestName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  guestPhone: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: OrderStatus,
    default: OrderStatus.PENDING,
  })
  status: OrderStatus;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'EUR' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  shippingAddress: Record<string, unknown> | null;

  @Column({ type: 'text', nullable: true })
  customerNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => User, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'customerId' })
  customer: Relation<User> | null;

  @OneToMany(() => StoreOrder, (so) => so.order, { cascade: true })
  storeOrders: Relation<StoreOrder[]>;

  @OneToMany(() => InventoryReservation, (ir) => ir.order, { cascade: true })
  reservations: Relation<InventoryReservation[]>;
}

