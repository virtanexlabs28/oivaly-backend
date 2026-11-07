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
import { InvoiceStatus } from '../enums/invoice-status.enum.js';
import { Order } from '../../orders/entities/order.entity.js';
import { Store } from '../../stores/entities/store.entity.js';

@Entity('invoices')
export class Invoice {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 50 })
  invoiceNumber: string;

  @Index()
  @Column({ type: 'varchar' })
  orderId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  storeId: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  customerId: string | null;

  @Column({ type: 'varchar', length: 150 })
  customerName: string;

  @Column({ type: 'varchar', length: 255 })
  customerEmail: string;

  @Column({ type: 'jsonb', nullable: true })
  billingAddress: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  shippingAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Index()
  @Column({
    type: 'enum',
    enum: InvoiceStatus,
    default: InvoiceStatus.PAID,
  })
  status: InvoiceStatus;

  @Column({ type: 'varchar', length: 50, default: 'STRIPE' })
  paymentMethod: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentReference: string | null;

  @Column({ type: 'jsonb' })
  itemsSnapshot: Array<{
    productId: string | null;
    productTitle: string;
    variantId?: string;
    sku?: string;
    storeId: string;
    storeName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }>;

  @Column({ type: 'varchar', length: 500, nullable: true })
  pdfUrl: string | null;

  @Column({ type: 'timestamp with time zone', default: () => 'CURRENT_TIMESTAMP' })
  issuedAt: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;

  @ManyToOne(() => Store, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store> | null;
}
