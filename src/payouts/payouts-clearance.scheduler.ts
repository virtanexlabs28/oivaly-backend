import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PayoutsService } from './payouts.service.js';

@Injectable()
export class PayoutsClearanceScheduler {
  private readonly logger = new Logger(PayoutsClearanceScheduler.name);

  constructor(private readonly payoutsService: PayoutsService) {}

  /**
   * Runs every night at midnight (00:00) to clear transactions older than 14 days.
   * Moves funds from pending balance into available balance.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDailyClearance() {
    this.logger.log('Running daily 14-day hold clearance job...');
    try {
      const result = await this.payoutsService.processClearance();
      this.logger.log(
        `Daily clearance job completed: Cleared ${result.clearedCount} transactions ($${result.totalClearedAmount})`,
      );
    } catch (err: any) {
      this.logger.error(`Daily clearance job failed: ${err.message}`, err.stack);
    }
  }

  /**
   * Runs bi-weekly / every 14 days or on schedule to disburse available balances.
   * Runs every Monday at 02:00 AM.
   */
  @Cron('0 2 * * 1') // Every Monday at 02:00 AM
  async handleScheduledPayouts() {
    this.logger.log('Running scheduled payout disbursement cycle...');
    try {
      const result = await this.payoutsService.processAllDuePayouts();
      this.logger.log(
        `Scheduled payout cycle completed: ${result.payoutsCount} payouts disbursed ($${result.totalDisbursed})`,
      );
    } catch (err: any) {
      this.logger.error(`Scheduled payout cycle failed: ${err.message}`, err.stack);
    }
  }
}
