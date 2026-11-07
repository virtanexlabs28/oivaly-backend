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
import { Store } from '../../stores/entities/store.entity.js';
import { Category } from '../../categories/entities/category.entity.js';
import { ProductStatus } from '../enums/product-status.enum.js';
import { ProductVariant } from './product-variant.entity.js';
import { ProductImage } from './product-image.entity.js';
import { ProductReview } from '../../reviews/entities/product-review.entity.js';


@Entity('products')
export class Product {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  categoryId: string | null;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 300, unique: true })
  slug: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  sku: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  price: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  vatRate: number;

  @Column({ type: 'boolean', default: false })
  vatIncluded: boolean;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  vatCode: string | null;

  @Index()
  @Column({
    type: 'enum',
    enum: ProductStatus,
    default: ProductStatus.DRAFT,
  })
  status: ProductStatus;

  @Column({ type: 'varchar', nullable: true, length: 2000 })
  rejectionReason: string | null;

  @Column({ type: 'boolean', default: true })
  trackInventory: boolean;

  @Column({ type: 'boolean', default: true })
  isReturnEligible: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;

  @ManyToOne(() => Category, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'categoryId' })
  category: Relation<Category> | null;

  @OneToMany(() => ProductVariant, (v) => v.product, { cascade: true })
  variants: Relation<ProductVariant[]>;

  @OneToMany(() => ProductImage, (img) => img.product, { cascade: true })
  images: Relation<ProductImage[]>;

  @OneToMany(() => ProductReview, (r) => r.product)
  reviews: Relation<ProductReview[]>;
}

