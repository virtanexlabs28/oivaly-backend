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
import { PaymentStatus } from '../enums/payment-status.enum.js';
import { Order } from '../../orders/entities/order.entity.js';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  orderId: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, nullable: true, length: 255 })
  stripePaymentIntentId: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true, length: 255 })
  stripeCheckoutSessionId: string | null;

  @Column({ type: 'text', nullable: true })
  paymentUrl: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  stripeClientSecret: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PaymentStatus,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 50, nullable: true })
  paymentMethod: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;
}
