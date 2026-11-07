import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * Platform-wide configuration settings that platform admins can change at runtime
 * via the admin API. These override the corresponding .env values.
 */
@Entity('platform_settings')
export class PlatformSettings {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Unique key name for the setting (e.g. 'PLATFORM_FEE_PERCENT') */
  @Column({ type: 'varchar', unique: true, length: 100 })
  key: string;

  /** Current value stored as string (parsed by the consumer) */
  @Column({ type: 'varchar', length: 500 })
  value: string;

  /** Human-readable label for the admin UI */
  @Column({ type: 'varchar', length: 200 })
  label: string;

  /** Description of what this setting controls */
  @Column({ type: 'text', nullable: true })
  description: string | null;

  /** Value type hint for validation: 'number' | 'string' | 'boolean' */
  @Column({ type: 'varchar', length: 20, default: 'number' })
  type: string;

  /** Min allowed value for numeric settings (optional) */
  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  minValue: number | null;

  /** Max allowed value for numeric settings (optional) */
  @Column({ type: 'decimal', precision: 12, scale: 4, nullable: true })
  maxValue: number | null;

  /** Who last changed this setting */
  @Column({ type: 'varchar', nullable: true })
  lastUpdatedBy: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

/** Well-known setting keys as constants */
export const SETTING_KEYS = {
  PLATFORM_FEE_PERCENT: 'PLATFORM_FEE_PERCENT',
  SELLER_PAYOUT_HOLD_DAYS: 'SELLER_PAYOUT_HOLD_DAYS',
  MINIMUM_PAYOUT_AMOUNT: 'MINIMUM_PAYOUT_AMOUNT',
} as const;
