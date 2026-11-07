import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
  type Relation,
} from 'typeorm';
import { PayoutMethod } from '../enums/payout-method.enum.js';
import { Store } from '../../stores/entities/store.entity.js';

@Entity('store_payout_settings')
export class StorePayoutSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true })
  storeId: string;

  @Column({
    type: 'enum',
    enum: PayoutMethod,
    default: PayoutMethod.BANK_TRANSFER,
  })
  payoutMethod: PayoutMethod;

  @Column({ type: 'varchar', length: 150, nullable: true })
  bankAccountName: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankAccountNumberMasked: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankRoutingNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankIban: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  bankSwift: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  stripeAccountId: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, default: 'pending' })
  stripeAccountStatus: string | null;

  @Column({ type: 'decimal', precision: 12, scale: 2, default: 50.0 })
  minimumPayoutThreshold: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToOne(() => Store, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'storeId' })
  store: Relation<Store>;
}
