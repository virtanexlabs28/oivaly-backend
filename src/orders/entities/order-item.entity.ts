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
import { StoreOrder } from './store-order.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import { ProductVariant } from '../../products/entities/product-variant.entity.js';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  storeOrderId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  productId: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  variantId: string | null;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  // ── Snapshots (Historical preservation) ───────────────────────────────────

  @Column({ type: 'varchar', length: 255 })
  productNameSnapshot: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  skuSnapshot: string | null;

  @Column({ type: 'jsonb', nullable: true })
  variantSnapshot: Record<string, unknown> | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  unitPrice: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatRate: number;

  @Column({ type: 'boolean', default: false })
  vatIncluded: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  vatCode: string | null;

  @Column({ type: 'integer' })
  quantity: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  taxAmount: number;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  total: number;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => StoreOrder, (so) => so.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeOrderId' })
  storeOrder: Relation<StoreOrder>;

  @ManyToOne(() => Product, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product> | null;

  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variantId' })
  variant: Relation<ProductVariant> | null;
}
