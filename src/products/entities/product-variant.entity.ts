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
import { Product } from './product.entity.js';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  size: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  color: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  model: string | null;

  /** Optional extra attribute (e.g. storage, material, etc.) */
  @Column({ type: 'varchar', length: 100, nullable: true })
  attributeKey: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  attributeValue: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 100, unique: true, nullable: true })
  sku: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, nullable: true })
  price: number | null;

  @Column({ type: 'integer', default: 0 })
  stockQuantity: number;

  @Column({ type: 'integer', default: 5 })
  lowStockThreshold: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Product, (p) => p.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;
}
