import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PlatformSettingsService } from './platform-settings.service.js';
import { SETTING_KEYS } from './entities/platform-settings.entity.js';

describe('PlatformSettingsService (Admin Configurable Fee, Hold Period & Threshold)', () => {
  let service: PlatformSettingsService;
  let settingsRepo: any;
  let configService: any;
  let inMemoryDb: Map<string, any>;

  beforeEach(async () => {
    inMemoryDb = new Map();

    settingsRepo = {
      create: vi.fn((data) => ({ ...data, id: `uuid-${data.key}` })),
      save: vi.fn((data) => {
        inMemoryDb.set(data.key, data);
        return Promise.resolve(data);
      }),
      findOne: vi.fn(({ where: { key } }) => Promise.resolve(inMemoryDb.get(key) || null)),
      find: vi.fn(() => Promise.resolve(Array.from(inMemoryDb.values()))),
    };

    configService = {
      get: vi.fn((key: string, defaultVal?: any) => defaultVal),
    };

    service = new PlatformSettingsService(settingsRepo, configService);
    await service.onModuleInit();
  });

  it('should initialize with default 10% fee, 14 days hold, and $50 minimum payout threshold', async () => {
    const fee = service.getNumber(SETTING_KEYS.PLATFORM_FEE_PERCENT);
    const holdDays = service.getNumber(SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS);
    const minPayout = service.getNumber(SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT);

    expect(fee).toBe(10);
    expect(holdDays).toBe(14);
    expect(minPayout).toBe(50);
  });

  describe('updateFeePercent', () => {
    it('should allow platform admin to update platform fee cut to 15%', async () => {
      await service.updateFeePercent(15, 'admin-user-1');

      expect(service.getNumber(SETTING_KEYS.PLATFORM_FEE_PERCENT)).toBe(15);
      const setting = inMemoryDb.get(SETTING_KEYS.PLATFORM_FEE_PERCENT);
      expect(setting.value).toBe('15');
      expect(setting.lastUpdatedBy).toBe('admin-user-1');
    });

    it('should reject fee percent below minimum 1%', async () => {
      await expect(service.updateFeePercent(0, 'admin-1')).rejects.toThrow(BadRequestException);
    });

    it('should reject fee percent exceeding maximum 50%', async () => {
      await expect(service.updateFeePercent(60, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateHoldDays', () => {
    it('should allow platform admin to update clearance hold period to 7 days', async () => {
      await service.updateHoldDays(7, 'admin-user-1');

      expect(service.getNumber(SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS)).toBe(7);
      const setting = inMemoryDb.get(SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS);
      expect(setting.value).toBe('7');
    });

    it('should reject hold period less than 1 day or greater than 90 days', async () => {
      await expect(service.updateHoldDays(0, 'admin-1')).rejects.toThrow(BadRequestException);
      await expect(service.updateHoldDays(100, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateMinimumPayout', () => {
    it('should allow platform admin to update minimum payout amount to $100', async () => {
      await service.updateMinimumPayout(100, 'admin-user-1');

      expect(service.getNumber(SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT)).toBe(100);
      const setting = inMemoryDb.get(SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT);
      expect(setting.value).toBe('100');
    });

    it('should reject minimum payout amount below $5', async () => {
      await expect(service.updateMinimumPayout(2, 'admin-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEffectiveSettings', () => {
    it('should return human-readable summary of all effective platform settings', async () => {
      const summary = await service.getEffectiveSettings();

      expect(summary.platformFeePercent.value).toBe(10);
      expect(summary.platformFeePercent.unit).toBe('%');
      expect(summary.sellerPayoutHoldDays.value).toBe(14);
      expect(summary.sellerPayoutHoldDays.unit).toBe('days');
      expect(summary.minimumPayoutAmount.value).toBe(50);
    });
  });
});
