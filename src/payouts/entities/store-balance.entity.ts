import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { Store } from '../../stores/entities/store.entity.js';

@Entity('store_balances')
export class StoreBalance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  storeId: string;

  /** Funds currently inside the 14-day clearance hold window */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  pendingBalance: number;

  /** Funds past the 14-day clearance hold, available for disbursement */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  availableBalance: number;

  /** Total cumulative amount successfully paid out to the seller */
  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  paidBalance: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;
}
