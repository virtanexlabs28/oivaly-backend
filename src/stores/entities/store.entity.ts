import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
  type Relation,
} from 'typeorm';
import { StoreStatus } from '../enums/store-status.enum.js';
import { StoreAdmin } from './store-admin.entity.js';

@Entity('stores')
export class Store {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', unique: true, length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 255 })
  legalBusinessName: string;

  @Index()
  @Column({ type: 'varchar', length: 100 })
  businessId: string;

  @Column({ type: 'boolean', default: false })
  isBusinessVerified: boolean;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  vatId: string | null;

  @Column({ type: 'varchar', nullable: true, length: 50 })
  bankIban: string | null;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  bankBic: string | null;

  @Column({ type: 'varchar', length: 500 })
  address: string;

  @Column({ type: 'varchar', length: 50 })
  phone: string;

  @Column({ type: 'varchar', length: 100 })
  contactName: string;

  @Column({ type: 'boolean', default: true })
  sellerAgreementAccepted: boolean;

  @Index()
  @Column({
    type: 'enum',
    enum: StoreStatus,
    default: StoreStatus.UNDER_REVIEW,
  })
  status: StoreStatus;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  rejectionReason: string | null;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  suspensionReason: string | null;

  // ── Store Profile Fields ───────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, length: 2000 })
  description: string | null;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  logoUrl: string | null;

  @Column({ type: 'varchar', nullable: true, length: 1000 })
  bannerUrl: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  websiteUrl: string | null;

  // ── Store Settings ────────────────────────────────────────────────────

  @Column({ type: 'varchar', nullable: true, length: 10, default: 'USD' })
  currency: string;

  @Column({ type: 'varchar', nullable: true, length: 100, default: 'UTC' })
  timezone: string;

  @Column({ type: 'boolean', default: false })
  autoSubmitProducts: boolean;

  @Column({ type: 'integer', default: 5 })
  defaultLowStockThreshold: number;

  // ── Timestamps ────────────────────────────────────────────────────────

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Relations
  @OneToMany(() => StoreAdmin, (sa) => sa.store, { cascade: true })
  storeAdmins: Relation<StoreAdmin[]>;
}
