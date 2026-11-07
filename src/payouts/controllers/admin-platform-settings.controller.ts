import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { PlatformSettingsService } from '../platform-settings.service.js';
import {
  UpdatePlatformFeeDto,
  UpdateHoldDaysDto,
  UpdateMinimumPayoutDto,
  UpdatePlatformSettingDto,
} from '../dto/platform-settings.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Marketplace Settings')
@ApiBearerAuth('access-token')
@Controller('admin/settings')
export class AdminPlatformSettingsController {
  constructor(private readonly settingsService: PlatformSettingsService) {}

  @Get()
  @RequirePermissions('settings.read')
  @ApiOperation({
    summary: 'Get All Platform Settings',
    description:
      'Returns all configurable marketplace settings including platform fee %, seller payout hold days, and minimum payout threshold — with last-updated metadata.',
  })
  @ApiResponse({ status: 200, description: 'All platform settings' })
  getAllSettings() {
    return this.settingsService.findAll();
  }

  @Get('summary')
  @RequirePermissions('settings.read')
  @ApiOperation({
    summary: 'Get Platform Settings Summary',
    description:
      'Returns a structured, human-readable summary of all active platform settings with labels, descriptions, and effective values.',
  })
  @ApiResponse({ status: 200, description: 'Settings summary' })
  getSettingsSummary() {
    return this.settingsService.getEffectiveSettings();
  }

  @Patch('fee-percent')
  @RequirePermissions('settings.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Platform Commission Fee (%)',
    description:
      'Sets the platform commission rate applied on every seller payment. For example, setting to 10 means the marketplace keeps 10% and sellers receive 90%. Changes take effect immediately for all new orders. Allowed range: 1–50%.',
  })
  @ApiResponse({ status: 200, description: 'Platform fee percent updated successfully' })
  @ApiResponse({ status: 400, description: 'Value out of allowed range (1–50)' })
  updateFeePercent(
    @Body() dto: UpdatePlatformFeeDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.settingsService.updateFeePercent(dto.feePercent, actor.sub);
  }

  @Patch('hold-days')
  @RequirePermissions('settings.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Seller Payout Hold Period (Days)',
    description:
      'Sets the number of days seller earnings are locked before becoming available for payout. The 14-day default protects against chargebacks. Changes apply to all new payments going forward. Allowed range: 1–90 days.',
  })
  @ApiResponse({ status: 200, description: 'Hold period updated successfully' })
  @ApiResponse({ status: 400, description: 'Value out of allowed range (1–90)' })
  updateHoldDays(
    @Body() dto: UpdateHoldDaysDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.settingsService.updateHoldDays(dto.holdDays, actor.sub);
  }

  @Patch('minimum-payout')
  @RequirePermissions('settings.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update Minimum Payout Threshold',
    description:
      'Sets the minimum cleared balance (in marketplace currency) a seller must have before an automated payout disbursement is triggered. Allowed range: $5–$10,000.',
  })
  @ApiResponse({ status: 200, description: 'Minimum payout threshold updated successfully' })
  @ApiResponse({ status: 400, description: 'Value out of allowed range (5–10000)' })
  updateMinimumPayout(
    @Body() dto: UpdateMinimumPayoutDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.settingsService.updateMinimumPayout(dto.minimumAmount, actor.sub);
  }

  @Get(':key')
  @RequirePermissions('settings.read')
  @ApiParam({ name: 'key', description: 'Setting key (e.g. PLATFORM_FEE_PERCENT)', example: 'PLATFORM_FEE_PERCENT' })
  @ApiOperation({
    summary: 'Get Single Platform Setting by Key',
    description: 'Returns the current value and metadata for a single platform setting key.',
  })
  @ApiResponse({ status: 200, description: 'Setting details' })
  @ApiResponse({ status: 404, description: 'Setting key not found' })
  getSetting(@Param('key') key: string) {
    return this.settingsService.findOne(key);
  }

  @Patch(':key')
  @RequirePermissions('settings.manage')
  @HttpCode(HttpStatus.OK)
  @ApiParam({ name: 'key', description: 'Setting key to update', example: 'PLATFORM_FEE_PERCENT' })
  @ApiOperation({
    summary: 'Update Any Platform Setting by Key',
    description: 'Generic endpoint to update any platform setting by its key. Validates against defined min/max bounds.',
  })
  @ApiResponse({ status: 200, description: 'Setting updated' })
  @ApiResponse({ status: 400, description: 'Invalid value or out of range' })
  @ApiResponse({ status: 404, description: 'Setting key not found' })
  updateSetting(
    @Param('key') key: string,
    @Body() dto: UpdatePlatformSettingDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.settingsService.updateSetting(key, dto.value, actor.sub);
  }
}
