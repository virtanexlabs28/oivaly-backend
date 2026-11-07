import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PayoutsService } from '../payouts.service.js';
import { StoreContextGuard } from '../../stores/guards/store-context.guard.js';
import { CurrentStore } from '../../stores/decorators/current-store.decorator.js';
import { SalesQueryDto } from '../dto/sales-query.dto.js';
import type { Store } from '../../stores/entities/store.entity.js';

@ApiTags('2. Seller / Store — Sales & Financials')
@ApiBearerAuth('access-token')
@UseGuards(StoreContextGuard)
@Controller('store/sales')
export class StoreSalesController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('summary')
  @ApiOperation({
    summary: 'Get Seller Financial & Sales Summary',
    description:
      'Returns tenant-isolated financial metrics for authenticated store: Gross Sales, Net Earnings (90%), Platform Fees Paid (10%), Pending 14-Day Hold Balance, and Available Payout Balance.',
  })
  @ApiResponse({ status: 200, description: 'Store financial summary' })
  getSummary(@CurrentStore() store: Store) {
    return this.payoutsService.getStoreSalesSummary(store.id);
  }

  @Get('analytics')
  @ApiOperation({
    summary: 'Get Store Sales Analytics & Chart Data',
    description:
      'Returns time-series revenue and order volume data grouped by date for dashboard charting (today, 7d, 30d, month, custom range).',
  })
  @ApiResponse({ status: 200, description: 'Sales analytics chart data' })
  getAnalytics(@CurrentStore() store: Store, @Query() query: SalesQueryDto) {
    return this.payoutsService.getStoreSalesAnalytics(store.id, query);
  }

  @Get('transactions')
  @ApiOperation({
    summary: 'List Store Sales Transactions',
    description:
      'Returns paginated list of sales transactions for authenticated store with 10% platform fee breakdown, 90% net earnings, and 14-day hold clearance countdown.',
  })
  @ApiResponse({ status: 200, description: 'Store sales transactions list' })
  getTransactions(@CurrentStore() store: Store, @Query() query: SalesQueryDto) {
    return this.payoutsService.getStoreTransactions(store.id, query);
  }

  @Get('top-products')
  @ApiOperation({
    summary: 'Get Top Selling Products for Store',
    description: 'Returns top products by units sold and gross revenue for authenticated store.',
  })
  @ApiResponse({ status: 200, description: 'Top selling products' })
  getTopProducts(@CurrentStore() store: Store, @Query('limit') limit?: number) {
    return this.payoutsService.getStoreTopProducts(store.id, limit ? Number(limit) : 10);
  }
}
