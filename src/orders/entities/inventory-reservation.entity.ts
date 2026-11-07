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
import { ReservationStatus } from '../enums/reservation-status.enum.js';
import { Order } from './order.entity.js';
import { StoreOrder } from './store-order.entity.js';
import { ProductVariant } from '../../products/entities/product-variant.entity.js';
import { Product } from '../../products/entities/product.entity.js';
import { Store } from '../../stores/entities/store.entity.js';

@Entity('inventory_reservations')
export class InventoryReservation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar' })
  orderId: string;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  storeOrderId: string | null;

  @Index()
  @Column({ type: 'varchar' })
  productId: string;

  @Index()
  @Column({ type: 'varchar' })
  variantId: string;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Column({ type: 'integer' })
  quantity: number;

  @Index()
  @Column({
    type: 'enum',
    enum: ReservationStatus,
    default: ReservationStatus.ACTIVE,
  })
  status: ReservationStatus;

  @Index()
  @Column({ type: 'timestamp' })
  expiresAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Order, (o) => o.reservations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'orderId' })
  order: Relation<Order>;

  @ManyToOne(() => StoreOrder, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeOrderId' })
  storeOrder: Relation<StoreOrder> | null;

  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'productId' })
  product: Relation<Product>;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variantId' })
  variant: Relation<ProductVariant>;

  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;
}
