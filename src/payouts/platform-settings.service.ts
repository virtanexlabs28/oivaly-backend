import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  PlatformSettings,
  SETTING_KEYS,
} from './entities/platform-settings.entity.js';

@Injectable()
export class PlatformSettingsService implements OnModuleInit {
  private readonly logger = new Logger(PlatformSettingsService.name);

  /** In-memory cache of all platform settings to avoid per-request DB round-trips */
  private cache = new Map<string, string>();

  constructor(
    @InjectRepository(PlatformSettings)
    private readonly settingsRepo: Repository<PlatformSettings>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * On boot: seed defaults from .env if DB rows don't exist yet, then cache all.
   */
  async onModuleInit() {
    const defaults: Array<Omit<PlatformSettings, 'id' | 'createdAt' | 'updatedAt' | 'lastUpdatedBy'>> = [
      {
        key: SETTING_KEYS.PLATFORM_FEE_PERCENT,
        value: String(this.configService.get('PLATFORM_FEE_PERCENT', 10)),
        label: 'Platform Commission Fee (%)',
        description:
          'The percentage cut the marketplace takes from every seller payment. E.g. 10 means the platform keeps 10% and pays 90% to the seller.',
        type: 'number',
        minValue: 1,
        maxValue: 50,
      },
      {
        key: SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS,
        value: String(this.configService.get('SELLER_PAYOUT_HOLD_DAYS', 14)),
        label: 'Seller Payout Clearance Hold (Days)',
        description:
          'Number of days a seller must wait after a payment before their earnings are released from the pending hold and become available for payout disbursement.',
        type: 'number',
        minValue: 1,
        maxValue: 90,
      },
      {
        key: SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT,
        value: String(this.configService.get('MINIMUM_PAYOUT_AMOUNT', 50)),
        label: 'Minimum Payout Threshold',
        description:
          'Minimum available balance (in marketplace currency) a seller must accumulate before an automated payout disbursement is triggered.',
        type: 'number',
        minValue: 5,
        maxValue: 10000,
      },
    ];

    for (const def of defaults) {
      const existing = await this.settingsRepo.findOne({ where: { key: def.key } });
      if (!existing) {
        const setting = this.settingsRepo.create(def);
        await this.settingsRepo.save(setting);
        this.logger.log(`Seeded platform setting [${def.key}] = ${def.value}`);
      }
    }

    // Build cache from DB
    await this.reloadCache();
    this.logger.log('Platform settings loaded into cache');
  }

  private async reloadCache() {
    const all = await this.settingsRepo.find();
    this.cache.clear();
    for (const s of all) {
      this.cache.set(s.key, s.value);
    }
  }

  /**
   * Returns a numeric setting value, first from DB cache, then from .env, then the hardcoded default.
   */
  getNumber(key: string, envDefault = 0): number {
    const cached = this.cache.get(key);
    if (cached !== undefined) return Number(cached);
    return Number(this.configService.get(key, envDefault));
  }

  /**
   * Returns a string setting value, first from DB cache, then from .env.
   */
  getString(key: string, envDefault = ''): string {
    const cached = this.cache.get(key);
    if (cached !== undefined) return cached;
    return this.configService.get<string>(key, envDefault) ?? envDefault;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Admin CRUD
  // ──────────────────────────────────────────────────────────────────────────

  async findAll(): Promise<PlatformSettings[]> {
    return this.settingsRepo.find({ order: { key: 'ASC' } });
  }

  async findOne(key: string): Promise<PlatformSettings> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) {
      throw new NotFoundException(`Setting '${key}' not found`);
    }
    return setting;
  }

  async updateSetting(key: string, value: string, actorId: string): Promise<PlatformSettings> {
    const setting = await this.findOne(key);

    // Validate against type and bounds
    if (setting.type === 'number') {
      const num = Number(value);
      if (isNaN(num)) {
        throw new BadRequestException(`Setting '${key}' requires a numeric value`);
      }
      if (setting.minValue !== null && num < Number(setting.minValue)) {
        throw new BadRequestException(
          `Setting '${key}' value ${num} is below minimum allowed ${setting.minValue}`,
        );
      }
      if (setting.maxValue !== null && num > Number(setting.maxValue)) {
        throw new BadRequestException(
          `Setting '${key}' value ${num} exceeds maximum allowed ${setting.maxValue}`,
        );
      }
    }

    const oldValue = setting.value;
    setting.value = value;
    setting.lastUpdatedBy = actorId;

    const saved = await this.settingsRepo.save(setting);
    this.cache.set(key, value);

    this.logger.log(
      `Platform setting [${key}] updated: ${oldValue} → ${value} by admin ${actorId}`,
    );

    return saved;
  }

  /** Convenience methods for the typed admin endpoints */
  async updateFeePercent(feePercent: number, actorId: string): Promise<PlatformSettings> {
    return this.updateSetting(SETTING_KEYS.PLATFORM_FEE_PERCENT, String(feePercent), actorId);
  }

  async updateHoldDays(holdDays: number, actorId: string): Promise<PlatformSettings> {
    return this.updateSetting(SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS, String(holdDays), actorId);
  }

  async updateMinimumPayout(minimumAmount: number, actorId: string): Promise<PlatformSettings> {
    return this.updateSetting(SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT, String(minimumAmount), actorId);
  }

  /** Returns current effective values as a summary object */
  async getEffectiveSettings() {
    const all = await this.findAll();
    const map = Object.fromEntries(all.map((s) => [s.key, s]));
    return {
      platformFeePercent: {
        value: Number(map[SETTING_KEYS.PLATFORM_FEE_PERCENT]?.value ?? 10),
        label: map[SETTING_KEYS.PLATFORM_FEE_PERCENT]?.label,
        description: map[SETTING_KEYS.PLATFORM_FEE_PERCENT]?.description,
        unit: '%',
        lastUpdatedBy: map[SETTING_KEYS.PLATFORM_FEE_PERCENT]?.lastUpdatedBy,
        updatedAt: map[SETTING_KEYS.PLATFORM_FEE_PERCENT]?.updatedAt,
      },
      sellerPayoutHoldDays: {
        value: Number(map[SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS]?.value ?? 14),
        label: map[SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS]?.label,
        description: map[SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS]?.description,
        unit: 'days',
        lastUpdatedBy: map[SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS]?.lastUpdatedBy,
        updatedAt: map[SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS]?.updatedAt,
      },
      minimumPayoutAmount: {
        value: Number(map[SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT]?.value ?? 50),
        label: map[SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT]?.label,
        description: map[SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT]?.description,
        unit: 'currency',
        lastUpdatedBy: map[SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT]?.lastUpdatedBy,
        updatedAt: map[SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT]?.updatedAt,
      },
    };
  }
}
