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
import { PayoutStatus } from '../enums/payout-status.enum.js';
import { PayoutMethod } from '../enums/payout-method.enum.js';
import { Store } from '../../stores/entities/store.entity.js';
import { SellerTransaction } from './seller-transaction.entity.js';

@Entity('store_payouts')
export class StorePayout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 50 })
  payoutNumber: string;

  @Index()
  @Column({ type: 'varchar' })
  storeId: string;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'varchar', length: 10, default: 'USD' })
  currency: string;

  @Index()
  @Column({
    type: 'enum',
    enum: PayoutStatus,
    default: PayoutStatus.SCHEDULED,
  })
  status: PayoutStatus;

  @Column({
    type: 'enum',
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  payoutMethod: PayoutMethod;

  @Column({ type: 'jsonb', nullable: true })
  destinationDetails: Record<string, unknown> | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  stripeTransferId: string | null;

  @Column({ type: 'text', nullable: true })
  failureReason: string | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  periodStartDate: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  periodEndDate: Date | null;

  @Column({ type: 'timestamp with time zone', nullable: true })
  processedAt: Date | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @ManyToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;

  @OneToMany(() => SellerTransaction, (tx) => tx.payout)
  transactions: Relation<SellerTransaction[]>;
}
