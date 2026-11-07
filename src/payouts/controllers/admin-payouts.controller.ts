import {
  Controller,
  Get,
  Post,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { PayoutsService } from '../payouts.service.js';
import { PayoutQueryDto } from '../dto/payout-query.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
@ApiTags('1. Platform Admin — Payouts & Settlement')
@ApiBearerAuth('access-token')
@Controller('admin/payouts')
export class AdminPayoutsController {
  constructor(private readonly payoutsService: PayoutsService) { }

  @Get('revenue')
  @RequirePermissions('payouts.read')
  @ApiOperation({
    summary: 'Platform Commission & Escrow Overview',
    description:
      'Returns aggregate platform financial metrics: GMV, total 10% marketplace fees earned, total seller pending 14-day hold balances, and total available for payout.',
  })
  @ApiResponse({ status: 200, description: 'Platform financial metrics' })
  getPlatformRevenue() {
    return this.payoutsService.getAdminPlatformRevenue();
  }

  @Get()
  @RequirePermissions('payouts.read')
  @ApiOperation({
    summary: 'List All Marketplace Payouts',
    description: 'Returns paginated list of payouts across all vendors.',
  })
  @ApiResponse({ status: 200, description: 'Payouts list' })
  getPayouts(@Query() query: PayoutQueryDto) {
    return this.payoutsService.getAdminPayouts(query);
  }

  @Post('process-clearance')
  @RequirePermissions('payouts.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Run 14-Day Hold Clearance Engine',
    description: 'Manually scans and clears all transactions that have completed their 14-day holding period.',
  })
  @ApiResponse({ status: 200, description: 'Clearance summary' })
  triggerClearance() {
    return this.payoutsService.processClearance();
  }

  @Post('process')
  @RequirePermissions('payouts.manage')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Process Scheduled Payout Cycle',
    description: 'Executes payout disbursements for all stores with available balance >= minimum threshold.',
  })
  @ApiResponse({ status: 200, description: 'Disbursement summary' })
  triggerPayouts() {
    return this.payoutsService.processAllDuePayouts();
  }
}
