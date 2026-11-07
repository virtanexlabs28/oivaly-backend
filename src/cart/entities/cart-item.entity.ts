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
import { Cart } from './cart.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import { ProductVariant } from '../../products/entities/product-variant.entity.js';
import { Store } from '../../stores/entities/store.entity.js';

@Entity('cart_items')
@Index(['cartId', 'productId', 'variantId'], { unique: true })
export class CartItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  cartId: string;

  @Index()
  @Column({ type: 'varchar' })
  productId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  variantId: string | null;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Cart, (c) => c.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cartId' })
  cart: Relation<Cart>;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;

  @ManyToOne(() => ProductVariant, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variantId' })
  variant: Relation<ProductVariant> | null;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;
}
