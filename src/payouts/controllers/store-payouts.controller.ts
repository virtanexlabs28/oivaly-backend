import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { PayoutsService } from '../payouts.service.js';
import { StoreContextGuard } from '../../stores/guards/store-context.guard.js';
import { CurrentStore } from '../../stores/decorators/current-store.decorator.js';
import { PayoutQueryDto } from '../dto/payout-query.dto.js';
import { UpdatePayoutSettingsDto } from '../dto/update-payout-settings.dto.js';
import type { Store } from '../../stores/entities/store.entity.js';

@ApiTags('2. Seller / Store — Payouts & Settlements')
@ApiBearerAuth('access-token')
@UseGuards(StoreContextGuard)
@Controller('store/payouts')
export class StorePayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get()
  @ApiOperation({
    summary: 'List Store Payout History',
    description: 'Returns paginated list of payout disbursements strictly for authenticated store.',
  })
  @ApiResponse({ status: 200, description: 'Store payouts list' })
  getPayouts(@CurrentStore() store: Store, @Query() query: PayoutQueryDto) {
    return this.payoutsService.getStorePayouts(store.id, query);
  }

  @Get('settings')
  @ApiOperation({
    summary: 'Get Store Payout Bank & Account Settings',
    description: 'Returns configured bank account info, masked account number, or Stripe Connect ID.',
  })
  @ApiResponse({ status: 200, description: 'Store payout settings' })
  getSettings(@CurrentStore() store: Store) {
    return this.payoutsService.getStorePayoutSettings(store.id);
  }

  @Put('settings')
  @ApiOperation({
    summary: 'Update Store Payout Bank & Account Settings',
    description: 'Updates bank account info (IBAN, SWIFT, routing number) or Stripe Connect account ID.',
  })
  @ApiResponse({ status: 200, description: 'Updated payout settings' })
  updateSettings(
    @CurrentStore() store: Store,
    @Body() dto: UpdatePayoutSettingsDto,
  ) {
    return this.payoutsService.updateStorePayoutSettings(store.id, dto);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Store Payout Details',
    description: 'Returns specific payout details and all orders/transactions included in the disbursement.',
  })
  @ApiParam({ name: 'id', description: 'Payout UUID' })
  @ApiResponse({ status: 200, description: 'Payout details' })
  @ApiResponse({ status: 404, description: 'Payout not found' })
  getPayout(@CurrentStore() store: Store, @Param('id', ParseUUIDPipe) id: string) {
    return this.payoutsService.getStorePayoutById(store.id, id);
  }
}
