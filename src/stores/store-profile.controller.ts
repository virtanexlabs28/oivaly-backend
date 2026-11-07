import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Store } from './entities/store.entity.js';
import { UpdateStoreProfileDto, UpdateStoreSettingsDto } from './dto/update-store-profile.dto.js';
import { StoreContextGuard } from './guards/store-context.guard.js';
import { CurrentStore } from './decorators/current-store.decorator.js';

/**
 * Store Admin: Manage their own store profile and settings.
 */
@ApiTags('2. Seller / Store — Profile & Settings')
@ApiBearerAuth('access-token')
@UseGuards(StoreContextGuard)
@Controller('store/profile')
export class StoreProfileController {
  constructor(
    @InjectRepository(Store)
    private storeRepo: Repository<Store>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get Own Store Profile (Store Admin)',
    description: 'Returns the authenticated store admin\'s store details, status, and settings.',
  })
  @ApiResponse({ status: 200, description: 'Store profile' })
  getProfile(@CurrentStore() store: Store) {
    return store;
  }

  @Put()
  @ApiOperation({
    summary: 'Update Store Profile (Store Admin)',
    description: 'Update the store\'s public profile: name, description, logo, contact info, website.',
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  async updateProfile(
    @Body() dto: UpdateStoreProfileDto,
    @CurrentStore() store: Store,
  ) {
    if (dto.name !== undefined) store.name = dto.name;
    if (dto.legalBusinessName !== undefined) store.legalBusinessName = dto.legalBusinessName;
    if (dto.businessId !== undefined) store.businessId = dto.businessId;
    if (dto.vatId !== undefined) store.vatId = dto.vatId ?? null;
    if (dto.bankIban !== undefined) store.bankIban = dto.bankIban ?? null;
    if (dto.bankBic !== undefined) store.bankBic = dto.bankBic ?? null;
    if (dto.description !== undefined) store.description = dto.description ?? null;
    if (dto.phone !== undefined) store.phone = dto.phone;
    if (dto.address !== undefined) store.address = dto.address;
    if (dto.contactName !== undefined) store.contactName = dto.contactName;
    if (dto.logoUrl !== undefined) store.logoUrl = dto.logoUrl ?? null;
    if (dto.websiteUrl !== undefined) store.websiteUrl = dto.websiteUrl ?? null;

    return this.storeRepo.save(store);
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Update Store Settings (Store Admin)',
    description: 'Update operational settings: currency, timezone, auto-submit, low-stock threshold.',
  })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  async updateSettings(
    @Body() dto: UpdateStoreSettingsDto,
    @CurrentStore() store: Store,
  ) {
    if (dto.currency !== undefined) store.currency = dto.currency;
    if (dto.timezone !== undefined) store.timezone = dto.timezone;
    if (dto.autoSubmitProducts !== undefined) store.autoSubmitProducts = dto.autoSubmitProducts;
    if (dto.defaultLowStockThreshold !== undefined) {
      store.defaultLowStockThreshold = dto.defaultLowStockThreshold;
    }

    return this.storeRepo.save(store);
  }
}
