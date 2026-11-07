import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ConfigService } from '@nestjs/config';

import { SellerTransaction } from './entities/seller-transaction.entity.js';
import { StoreBalance } from './entities/store-balance.entity.js';
import { StorePayout } from './entities/store-payout.entity.js';
import { StorePayoutSettings } from './entities/store-payout-settings.entity.js';
import { SellerTransactionStatus } from './enums/seller-transaction-status.enum.js';
import { PayoutStatus } from './enums/payout-status.enum.js';
import { PayoutMethod } from './enums/payout-method.enum.js';
import { Order } from '../orders/entities/order.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { UpdatePayoutSettingsDto } from './dto/update-payout-settings.dto.js';
import { SalesPeriod, SalesQueryDto } from './dto/sales-query.dto.js';
import { PayoutQueryDto } from './dto/payout-query.dto.js';
import { NotificationsService } from '../notifications/notifications.service.js';
import { PlatformSettingsService } from './platform-settings.service.js';
import { SETTING_KEYS } from './entities/platform-settings.entity.js';

@Injectable()
export class PayoutsService {
  private readonly logger = new Logger(PayoutsService.name);

  constructor(
    @InjectRepository(SellerTransaction)
    private readonly transactionRepo: Repository<SellerTransaction>,
    @InjectRepository(StoreBalance)
    private readonly balanceRepo: Repository<StoreBalance>,
    @InjectRepository(StorePayout)
    private readonly payoutRepo: Repository<StorePayout>,
    @InjectRepository(StorePayoutSettings)
    private readonly settingsRepo: Repository<StorePayoutSettings>,
    @InjectRepository(Store)
    private readonly storeRepo: Repository<Store>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly configService: ConfigService,
    private readonly notificationsService: NotificationsService,
    private readonly platformSettings: PlatformSettingsService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // 1. ORDER EARNINGS & 10% PLATFORM CUT (Invoked when order is paid)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Splits order revenue across stores:
   * - System cuts exactly 10% platform fee
   * - 90% is credited to seller's pending balance
   * - Funds are locked under 14-day clearance holding period
   */
  async recordOrderEarnings(order: Order): Promise<SellerTransaction[]> {
    // Read from DB-backed platform settings (admin-configurable at runtime)
    const feePercent = this.platformSettings.getNumber(SETTING_KEYS.PLATFORM_FEE_PERCENT, 10);
    const commissionRate = feePercent / 100;
    const holdDays = this.platformSettings.getNumber(SETTING_KEYS.SELLER_PAYOUT_HOLD_DAYS, 14);

    const now = new Date();
    const availableOn = new Date(now.getTime() + holdDays * 24 * 60 * 60 * 1000);

    const createdTransactions: SellerTransaction[] = [];

    if (!order.storeOrders || order.storeOrders.length === 0) {
      this.logger.warn(`Order ${order.orderNumber} has no store orders to split`);
      return [];
    }

    for (const storeOrder of order.storeOrders) {
      // Idempotency check: don't create duplicate transaction for this store order
      const existing = await this.transactionRepo.findOne({
        where: { storeOrderId: storeOrder.id },
      });
      if (existing) {
        continue;
      }

      const grossAmount = Math.round(Number(storeOrder.totalAmount) * 100) / 100;
      const commissionAmount = Math.round(grossAmount * commissionRate * 100) / 100;
      const netAmount = Math.round((grossAmount - commissionAmount) * 100) / 100;

      const transaction = this.transactionRepo.create({
        storeId: storeOrder.storeId,
        orderId: order.id,
        storeOrderId: storeOrder.id,
        orderNumber: order.orderNumber,
        storeOrderNumber: storeOrder.storeOrderNumber,
        grossAmount,
        commissionRate,
        commissionAmount,
        netAmount,
        currency: order.currency ?? 'USD',
        status: SellerTransactionStatus.PENDING_CLEARANCE,
        availableOn,
      });

      const savedTx = await this.transactionRepo.save(transaction);
      createdTransactions.push(savedTx);

      // Update seller's pending balance
      await this.creditPendingBalance(storeOrder.storeId, netAmount, order.currency ?? 'USD');
    }

    this.logger.log(
      `Recorded ${createdTransactions.length} seller earnings for order ${order.orderNumber} (10% platform fee applied, 14-day hold until ${availableOn.toISOString()})`,
    );

    return createdTransactions;
  }

  /**
   * Helper to credit store pending balance
   */
  private async creditPendingBalance(storeId: string, amount: number, currency: string): Promise<StoreBalance> {
    let balance = await this.balanceRepo.findOne({ where: { storeId } });
    if (!balance) {
      balance = this.balanceRepo.create({
        storeId,
        pendingBalance: 0,
        availableBalance: 0,
        paidBalance: 0,
        currency,
      });
    }

    balance.pendingBalance = Math.round((Number(balance.pendingBalance) + amount) * 100) / 100;
    return this.balanceRepo.save(balance);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. 14-DAY HOLD CLEARANCE ENGINE
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Scans all transactions in PENDING_CLEARANCE where availableOn <= NOW().
   * Moves funds from store pendingBalance -> availableBalance and marks transactions as AVAILABLE.
   */
  async processClearance(): Promise<{ clearedCount: number; totalClearedAmount: number }> {
    const now = new Date();
    const matureTransactions = await this.transactionRepo.find({
      where: {
        status: SellerTransactionStatus.PENDING_CLEARANCE,
        availableOn: LessThanOrEqual(now),
      },
    });

    if (matureTransactions.length === 0) {
      return { clearedCount: 0, totalClearedAmount: 0 };
    }

    let totalClearedAmount = 0;

    for (const tx of matureTransactions) {
      tx.status = SellerTransactionStatus.AVAILABLE;
      tx.clearedAt = now;
      await this.transactionRepo.save(tx);

      // Shift funds in StoreBalance
      let balance = await this.balanceRepo.findOne({ where: { storeId: tx.storeId } });
      if (balance) {
        const net = Number(tx.netAmount);
        balance.pendingBalance = Math.max(0, Math.round((Number(balance.pendingBalance) - net) * 100) / 100);
        balance.availableBalance = Math.round((Number(balance.availableBalance) + net) * 100) / 100;
        await this.balanceRepo.save(balance);
      }

      totalClearedAmount += Number(tx.netAmount);
    }

    totalClearedAmount = Math.round(totalClearedAmount * 100) / 100;
    this.logger.log(`Cleared ${matureTransactions.length} transactions totaling $${totalClearedAmount} (14-day hold expired)`);

    return { clearedCount: matureTransactions.length, totalClearedAmount };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. SELLER SALES ANALYTICS & DASHBOARD (Tenant Isolated)
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Overview summary for seller dashboard:
   * Gross Sales, 10% Fees Paid, Net Earnings, Pending Balance (14d hold), Available Balance
   */
  async getStoreSalesSummary(storeId: string) {
    const balance = await this.balanceRepo.findOne({ where: { storeId } }) ?? {
      pendingBalance: 0,
      availableBalance: 0,
      paidBalance: 0,
      currency: 'USD',
    };

    const stats = await this.transactionRepo
      .createQueryBuilder('tx')
      .where('tx.storeId = :storeId', { storeId })
      .andWhere('tx.status != :refunded', { refunded: SellerTransactionStatus.REFUNDED })
      .select('COUNT(tx.id)', 'totalOrdersCount')
      .addSelect('COALESCE(SUM(tx.grossAmount), 0)', 'totalGrossSales')
      .addSelect('COALESCE(SUM(tx.commissionAmount), 0)', 'totalCommissionPaid')
      .addSelect('COALESCE(SUM(tx.netAmount), 0)', 'totalNetEarnings')
      .getRawOne();

    // Next scheduled clearance date
    const nextClearanceTx = await this.transactionRepo.findOne({
      where: {
        storeId,
        status: SellerTransactionStatus.PENDING_CLEARANCE,
      },
      order: { availableOn: 'ASC' },
    });

    const settings = await this.getStorePayoutSettings(storeId);

    return {
      financials: {
        totalGrossSales: Number(stats?.totalGrossSales ?? 0),
        totalCommissionPaid: Number(stats?.totalCommissionPaid ?? 0),
        commissionRatePercent: this.platformSettings.getNumber(SETTING_KEYS.PLATFORM_FEE_PERCENT, 10),
        totalNetEarnings: Number(stats?.totalNetEarnings ?? 0),
        totalSalesCount: Number(stats?.totalOrdersCount ?? 0),
        currency: balance.currency ?? 'USD',
      },
      balances: {
        pendingBalance: Number(balance.pendingBalance ?? 0),
        pendingDescription: 'Sales currently inside the 14-day clearance hold period',
        availableBalance: Number(balance.availableBalance ?? 0),
        availableDescription: 'Cleared funds past 14 days, ready for automated payout disbursement',
        paidBalance: Number(balance.paidBalance ?? 0),
        paidDescription: 'Total lifetime payouts successfully disbursed to your bank/account',
        nextClearanceDate: nextClearanceTx?.availableOn ?? null,
      },
      payoutSettings: {
        payoutMethod: settings.payoutMethod,
        isConfigured: !!(settings.bankAccountNumberMasked || settings.stripeAccountId),
        minimumPayoutThreshold: Number(settings.minimumPayoutThreshold),
      },
    };
  }

  /**
   * Time-series analytics chart data for seller
   */
  async getStoreSalesAnalytics(storeId: string, query: SalesQueryDto) {
    const { startDate, endDate } = this.resolveDateRange(query);

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .where('tx.storeId = :storeId', { storeId })
      .andWhere('tx.status != :refunded', { refunded: SellerTransactionStatus.REFUNDED })
      .andWhere('tx.createdAt >= :startDate', { startDate })
      .andWhere('tx.createdAt <= :endDate', { endDate });

    const rawData = await qb
      .select("TO_CHAR(tx.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(tx.id)', 'orderCount')
      .addSelect('SUM(tx.grossAmount)', 'grossSales')
      .addSelect('SUM(tx.commissionAmount)', 'commissionPaid')
      .addSelect('SUM(tx.netAmount)', 'netEarnings')
      .groupBy("TO_CHAR(tx.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawOne();

    const chartData = await qb
      .select("TO_CHAR(tx.createdAt, 'YYYY-MM-DD')", 'date')
      .addSelect('COUNT(tx.id)', 'orderCount')
      .addSelect('SUM(tx.grossAmount)', 'grossSales')
      .addSelect('SUM(tx.commissionAmount)', 'commissionPaid')
      .addSelect('SUM(tx.netAmount)', 'netEarnings')
      .groupBy("TO_CHAR(tx.createdAt, 'YYYY-MM-DD')")
      .orderBy('date', 'ASC')
      .getRawMany();

    const totals = chartData.reduce(
      (acc, item) => {
        acc.grossSales += Number(item.grossSales);
        acc.netEarnings += Number(item.netEarnings);
        acc.commissionPaid += Number(item.commissionPaid);
        acc.orderCount += Number(item.orderCount);
        return acc;
      },
      { grossSales: 0, netEarnings: 0, commissionPaid: 0, orderCount: 0 },
    );

    return {
      period: query.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totals: {
        grossSales: Math.round(totals.grossSales * 100) / 100,
        netEarnings: Math.round(totals.netEarnings * 100) / 100,
        commissionPaid: Math.round(totals.commissionPaid * 100) / 100,
        orderCount: totals.orderCount,
        averageOrderValue: totals.orderCount > 0 ? Math.round((totals.grossSales / totals.orderCount) * 100) / 100 : 0,
      },
      series: chartData.map((d) => ({
        date: d.date,
        orderCount: Number(d.orderCount),
        grossSales: Number(d.grossSales),
        netEarnings: Number(d.netEarnings),
        commissionPaid: Number(d.commissionPaid),
      })),
    };
  }

  /**
   * Paginated list of seller transactions with hold countdown & 10% fee breakdown
   */
  async getStoreTransactions(storeId: string, query: SalesQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.transactionRepo
      .createQueryBuilder('tx')
      .where('tx.storeId = :storeId', { storeId })
      .orderBy('tx.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.startDate) {
      qb.andWhere('tx.createdAt >= :startDate', { startDate: new Date(query.startDate) });
    }
    if (query.endDate) {
      qb.andWhere('tx.createdAt <= :endDate', { endDate: new Date(query.endDate) });
    }

    const [items, total] = await qb.getManyAndCount();

    const now = new Date();
    const enriched = items.map((tx) => {
      const daysRemaining = Math.max(
        0,
        Math.ceil((new Date(tx.availableOn).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      );
      return {
        ...tx,
        isCleared: tx.status === SellerTransactionStatus.AVAILABLE || tx.status === SellerTransactionStatus.PAID_OUT,
        daysRemainingInHold: tx.status === SellerTransactionStatus.PENDING_CLEARANCE ? daysRemaining : 0,
      };
    });

    return {
      items: enriched,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Top-selling products for the authenticated store
   */
  async getStoreTopProducts(storeId: string, limit = 10) {
    const raw = await this.orderItemRepo
      .createQueryBuilder('item')
      .innerJoin('item.storeOrder', 'so')
      .where('so.storeId = :storeId', { storeId })
      .select('item.productId', 'productId')
      .addSelect('item.productNameSnapshot', 'title')
      .addSelect('SUM(item.quantity)', 'unitsSold')
      .addSelect('SUM(item.total)', 'revenue')
      .groupBy('item.productId')
      .addGroupBy('item.productNameSnapshot')
      .orderBy('revenue', 'DESC')
      .limit(limit)
      .getRawMany();

    return raw.map((r) => ({
      productId: r.productId,
      title: r.title,
      unitsSold: Number(r.unitsSold ?? 0),
      revenue: Number(r.revenue ?? 0),
    }));
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PAYOUT EXECUTION & SETTINGS
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Execute payout for a store that has available balance
   */
  async processStorePayout(storeId: string): Promise<StorePayout> {
    const balance = await this.balanceRepo.findOne({ where: { storeId } });
    if (!balance || Number(balance.availableBalance) <= 0) {
      throw new BadRequestException('Store has no available balance to disburse');
    }

    const settings = await this.getStorePayoutSettings(storeId);
    if (Number(balance.availableBalance) < Number(settings.minimumPayoutThreshold)) {
      throw new BadRequestException(
        `Available balance of $${balance.availableBalance} is below minimum payout threshold of $${settings.minimumPayoutThreshold}`,
      );
    }

    const availableAmount = Math.round(Number(balance.availableBalance) * 100) / 100;

    // Generate payout number
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const payoutNumber = `PAY-${timestamp}-${randomSuffix}`;

    const payout = this.payoutRepo.create({
      payoutNumber,
      storeId,
      amount: availableAmount,
      currency: balance.currency ?? 'USD',
      status: PayoutStatus.COMPLETED,
      payoutMethod: settings.payoutMethod,
      destinationDetails: {
        bankAccountName: settings.bankAccountName,
        bankAccountNumberMasked: settings.bankAccountNumberMasked,
        bankIban: settings.bankIban,
        stripeAccountId: settings.stripeAccountId,
      },
      processedAt: new Date(),
    });

    const savedPayout = await this.payoutRepo.save(payout);

    // Link all available transactions to this payout
    const availableTxs = await this.transactionRepo.find({
      where: {
        storeId,
        status: SellerTransactionStatus.AVAILABLE,
      },
    });

    for (const tx of availableTxs) {
      tx.status = SellerTransactionStatus.PAID_OUT;
      tx.payoutId = savedPayout.id;
      await this.transactionRepo.save(tx);
    }

    // Deduct from availableBalance and add to paidBalance
    balance.availableBalance = 0;
    balance.paidBalance = Math.round((Number(balance.paidBalance) + availableAmount) * 100) / 100;
    await this.balanceRepo.save(balance);

    this.logger.log(`Disbursed payout ${payoutNumber} of $${availableAmount} to store ${storeId}`);

    return savedPayout;
  }

  /**
   * Run automated payout cycle:
   * 1. Runs 14-day clearance engine
   * 2. Finds all stores with availableBalance >= minimumThreshold
   * 3. Disburses payouts
   */
  async processAllDuePayouts(): Promise<{
    clearedTransactions: number;
    payoutsCount: number;
    totalDisbursed: number;
  }> {
    const clearanceResult = await this.processClearance();

    const defaultMinThreshold = this.platformSettings.getNumber(SETTING_KEYS.MINIMUM_PAYOUT_AMOUNT, 50);
    const eligibleBalances = await this.balanceRepo
      .createQueryBuilder('b')
      .where('b.availableBalance >= :min', { min: defaultMinThreshold })
      .getMany();

    let payoutsCount = 0;
    let totalDisbursed = 0;

    for (const b of eligibleBalances) {
      try {
        const payout = await this.processStorePayout(b.storeId);
        payoutsCount++;
        totalDisbursed += Number(payout.amount);
      } catch (err: any) {
        this.logger.error(`Error processing payout for store ${b.storeId}: ${err.message}`);
      }
    }

    return {
      clearedTransactions: clearanceResult.clearedCount,
      payoutsCount,
      totalDisbursed: Math.round(totalDisbursed * 100) / 100,
    };
  }

  /**
   * List payouts for authenticated store
   */
  async getStorePayouts(storeId: string, query: PayoutQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.payoutRepo
      .createQueryBuilder('p')
      .where('p.storeId = :storeId', { storeId })
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Get single payout with included transactions
   */
  async getStorePayoutById(storeId: string, payoutId: string) {
    const payout = await this.payoutRepo.findOne({
      where: { id: payoutId, storeId },
      relations: { transactions: true },
    });

    if (!payout) {
      throw new NotFoundException(`Payout ${payoutId} not found`);
    }

    return payout;
  }

  /**
   * Get or initialize seller payout settings
   */
  async getStorePayoutSettings(storeId: string): Promise<StorePayoutSettings> {
    let settings = await this.settingsRepo.findOne({ where: { storeId } });
    if (!settings) {
      settings = this.settingsRepo.create({
        storeId,
        payoutMethod: PayoutMethod.BANK_TRANSFER,
        minimumPayoutThreshold: Number(this.configService.get('MINIMUM_PAYOUT_AMOUNT', 50)),
      });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  /**
   * Update seller payout settings
   */
  async updateStorePayoutSettings(storeId: string, dto: UpdatePayoutSettingsDto): Promise<StorePayoutSettings> {
    let settings = await this.getStorePayoutSettings(storeId);

    if (dto.payoutMethod) settings.payoutMethod = dto.payoutMethod;
    if (dto.bankAccountName !== undefined) settings.bankAccountName = dto.bankAccountName;
    if (dto.bankAccountNumber) {
      // Store masked account number (e.g. *******1234)
      const last4 = dto.bankAccountNumber.slice(-4);
      settings.bankAccountNumberMasked = `••••••••${last4}`;
    }
    if (dto.bankRoutingNumber !== undefined) settings.bankRoutingNumber = dto.bankRoutingNumber;
    if (dto.bankIban !== undefined) settings.bankIban = dto.bankIban;
    if (dto.bankSwift !== undefined) settings.bankSwift = dto.bankSwift;
    if (dto.stripeAccountId !== undefined) settings.stripeAccountId = dto.stripeAccountId;
    if (dto.minimumPayoutThreshold !== undefined) settings.minimumPayoutThreshold = dto.minimumPayoutThreshold;

    return this.settingsRepo.save(settings);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 5. PLATFORM ADMIN PAYOUTS & REVENUE OVERVIEW
  // ──────────────────────────────────────────────────────────────────────────

  async getAdminPlatformRevenue() {
    const stats = await this.transactionRepo
      .createQueryBuilder('tx')
      .select('COALESCE(SUM(tx.grossAmount), 0)', 'totalGmv')
      .addSelect('COALESCE(SUM(tx.commissionAmount), 0)', 'totalPlatformRevenue')
      .addSelect('COALESCE(SUM(tx.netAmount), 0)', 'totalSellerEarnings')
      .addSelect('COUNT(tx.id)', 'totalTransactionCount')
      .getRawOne();

    const balances = await this.balanceRepo
      .createQueryBuilder('b')
      .select('COALESCE(SUM(b.pendingBalance), 0)', 'totalPendingHold')
      .addSelect('COALESCE(SUM(b.availableBalance), 0)', 'totalAvailableForPayout')
      .addSelect('COALESCE(SUM(b.paidBalance), 0)', 'totalPaidOut')
      .getRawOne();

    return {
      grossMarketplaceVolume: Number(stats?.totalGmv ?? 0),
      platformFeePercent: Number(this.configService.get('PLATFORM_FEE_PERCENT', 10)),
      totalPlatformCommissionEarned: Number(stats?.totalPlatformRevenue ?? 0),
      totalSellerEarnings: Number(stats?.totalSellerEarnings ?? 0),
      totalSalesTransactions: Number(stats?.totalTransactionCount ?? 0),
      escrowBalances: {
        totalPendingUnder14DayHold: Number(balances?.totalPendingHold ?? 0),
        totalAvailableForDisbursement: Number(balances?.totalAvailableForPayout ?? 0),
        totalSuccessfullyPaidOut: Number(balances?.totalPaidOut ?? 0),
      },
    };
  }

  async getAdminPayouts(query: PayoutQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.payoutRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.store', 'store')
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  private resolveDateRange(query: SalesQueryDto): { startDate: Date; endDate: Date } {
    const now = new Date();
    let startDate: Date;
    const endDate = query.endDate ? new Date(query.endDate) : now;

    if (query.startDate) {
      startDate = new Date(query.startDate);
      return { startDate, endDate };
    }

    switch (query.period) {
      case SalesPeriod.TODAY:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case SalesPeriod.LAST_7_DAYS:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case SalesPeriod.THIS_MONTH:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case SalesPeriod.ALL:
        startDate = new Date(0);
        break;
      case SalesPeriod.LAST_30_DAYS:
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
    }

    return { startDate, endDate };
  }
}
