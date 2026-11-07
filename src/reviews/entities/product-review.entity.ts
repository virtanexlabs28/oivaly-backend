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
import { ReviewStatus } from '../enums/review-status.enum.js';
import { Product } from '../../products/entities/product.entity.js';
import { User } from '../../users/entities/user.entity.js';
import { Order } from '../../orders/entities/order.entity.js';

@Entity('product_reviews')
@Index(['productId', 'userId'], { unique: true }) // One review per user per product
export class ProductReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  productId: string;

  @Index()
  @Column({ type: 'varchar' })
  userId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  orderId: string | null;

  @Column({ type: 'integer' })
  rating: number; // 1 to 5

  @Column({ type: 'varchar', length: 150, nullable: true })
  title: string | null;

  @Column({ type: 'text' })
  comment: string;

  @Index()
  @Column({
    type: 'enum',
    enum: ReviewStatus,
    default: ReviewStatus.PUBLISHED,
  })
  status: ReviewStatus;

  @Column({ type: 'boolean', default: true })
  isVerifiedPurchase: boolean;

  @Column({ type: 'text', nullable: true })
  adminNotes: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Product, (p) => p.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;

  @ManyToOne(() => User, (u) => u.reviews, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: Relation<User>;

  @ManyToOne(() => Order, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order> | null;
}
