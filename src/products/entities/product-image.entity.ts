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
import { Product } from './product.entity.js';

@Entity('product_images')
export class ProductImage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  productId: string;

  @Column({ type: 'varchar', length: 1000 })
  url: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  altText: string | null;

  @Column({ type: 'integer', default: 0 })
  sortOrder: number;

  @Column({ type: 'boolean', default: false })
  isPrimary: boolean;

  @CreateDateColumn()
  createdAt: Date;

  // Relations
  @ManyToOne(() => Product, (p) => p.images, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;
}
