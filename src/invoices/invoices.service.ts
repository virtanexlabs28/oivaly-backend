import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Invoice } from './entities/invoice.entity.js';
import { InvoiceStatus } from './enums/invoice-status.enum.js';
import { InvoiceQueryDto } from './dto/invoice-query.dto.js';
import { Order } from '../orders/entities/order.entity.js';
import { NotificationsService } from '../notifications/notifications.service.js';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectRepository(Invoice)
    private readonly invoiceRepo: Repository<Invoice>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Generates a tax-compliant, official invoice upon order payment.
   */
  async generateOrderInvoice(orderId: string, paymentReference?: string): Promise<Invoice> {
    const existing = await this.invoiceRepo.findOne({ where: { orderId } });
    if (existing) {
      return existing; // Idempotent
    }

    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        customer: true,
        storeOrders: {
          items: { product: true },
          store: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Generate unique invoice number: INV-YYYYMMDD-XXXXX
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
    const invoiceNumber = `INV-${dateStr}-${randomSuffix}`;

    // Flatten line items snapshot
    const itemsSnapshot: Array<{
      productId: string | null;
      productTitle: string;
      variantId?: string;
      sku?: string;
      storeId: string;
      storeName: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }> = [];

    if (order.storeOrders) {
      for (const so of order.storeOrders) {
        if (so.items) {
          for (const item of so.items) {
            itemsSnapshot.push({
              productId: item.productId,
              productTitle: item.productNameSnapshot,
              variantId: item.variantId ?? undefined,
              sku: item.skuSnapshot ?? undefined,
              storeId: so.storeId,
              storeName: so.store?.name ?? 'Store',
              quantity: item.quantity,
              unitPrice: Number(item.unitPrice),
              totalPrice: Number(item.total),
            });
          }
        }
      }
    }

    const customerEmail = order.isGuest ? (order.guestEmail ?? 'guest@example.com') : (order.customer?.email ?? 'customer@example.com');
    const customerName = order.isGuest ? (order.guestName ?? 'Guest Customer') : (order.customer?.name ?? order.customer?.email ?? 'Customer');

    const invoice = this.invoiceRepo.create({
      invoiceNumber,
      orderId: order.id,
      storeId: null, // Parent invoice encompasses all order stores
      customerId: order.customerId,
      customerName,
      customerEmail,
      billingAddress: order.shippingAddress,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      shippingAmount: Number(order.shippingAmount),
      totalAmount: Number(order.totalAmount),
      currency: order.currency ?? 'USD',
      status: InvoiceStatus.PAID,
      paymentMethod: 'STRIPE',
      paymentReference: paymentReference ?? null,
      itemsSnapshot,
      issuedAt: new Date(),
      paidAt: new Date(),
    });

    const savedInvoice = await this.invoiceRepo.save(invoice);
    this.logger.log(`Created invoice ${invoiceNumber} for order ${order.orderNumber} ($${order.totalAmount})`);

    try {
      await this.notificationsService.sendInvoiceEmail(
        customerEmail,
        invoiceNumber,
        order.orderNumber,
        invoice.totalAmount,
        invoice.currency,
      );
    } catch (err: any) {
      this.logger.warn(`Failed to dispatch invoice email for ${invoiceNumber}: ${err.message}`);
    }

    return savedInvoice;
  }

  /**
   * Find invoices for authenticated customer
   */
  async findCustomerInvoices(customerId: string, query: InvoiceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .where('inv.customerId = :customerId', { customerId })
      .orderBy('inv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('inv.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere('inv.invoiceNumber ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Find single customer invoice by ID
   */
  async findCustomerInvoiceById(invoiceId: string, customerId: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: { order: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    if (invoice.customerId && invoice.customerId !== customerId) {
      throw new ForbiddenException('Access denied to invoice belonging to another customer');
    }

    return invoice;
  }

  /**
   * Find invoice by order ID (for customer order detail view)
   */
  async findInvoiceByOrderId(orderId: string, customerId?: string) {
    const invoice = await this.invoiceRepo.findOne({
      where: { orderId },
      relations: { order: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice for order ${orderId} not found`);
    }

    if (customerId && invoice.customerId && invoice.customerId !== customerId) {
      throw new ForbiddenException('Access denied');
    }

    return invoice;
  }

  /**
   * Find invoices strictly belonging to authenticated seller's store
   */
  async findStoreInvoices(storeId: string, query: InvoiceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    // A parent invoice contains this store if itemsSnapshot has an item with storeId
    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .where(`inv.itemsSnapshot @> :storeFilter`, {
        storeFilter: JSON.stringify([{ storeId }]),
      })
      .orderBy('inv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere('inv.invoiceNumber ILIKE :search', { search: `%${query.search}%` });
    }

    const [items, total] = await qb.getManyAndCount();

    // Filter items in each invoice so the seller only sees their store's line items
    const filteredItems = items.map((inv) => {
      const storeItems = (inv.itemsSnapshot || []).filter((it) => it.storeId === storeId);
      const storeTotal = storeItems.reduce((acc, it) => acc + Number(it.totalPrice), 0);
      return {
        ...inv,
        storeSpecificItems: storeItems,
        storeSpecificTotal: Math.round(storeTotal * 100) / 100,
      };
    });

    return {
      items: filteredItems,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Find single invoice scoped strictly to authenticated seller's store
   */
  async findStoreInvoiceById(invoiceId: string, storeId: string) {
    const invoice = await this.invoiceRepo.findOne({ where: { id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const storeItems = (invoice.itemsSnapshot || []).filter((it) => it.storeId === storeId);
    if (storeItems.length === 0) {
      throw new ForbiddenException('Invoice contains no items belonging to your store');
    }

    const storeTotal = storeItems.reduce((acc, it) => acc + Number(it.totalPrice), 0);

    return {
      ...invoice,
      itemsSnapshot: storeItems,
      subtotal: Math.round(storeTotal * 100) / 100,
      totalAmount: Math.round(storeTotal * 100) / 100,
    };
  }

  /**
   * Admin: List all marketplace invoices
   */
  async findAllInvoicesAdmin(query: InvoiceQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const qb = this.invoiceRepo
      .createQueryBuilder('inv')
      .orderBy('inv.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('inv.status = :status', { status: query.status });
    }
    if (query.search) {
      qb.andWhere(
        '(inv.invoiceNumber ILIKE :s OR inv.customerEmail ILIKE :s OR inv.customerName ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [items, total] = await qb.getManyAndCount();

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  /**
   * Admin: Find single invoice with full details
   */
  async findInvoiceByIdAdmin(invoiceId: string): Promise<Invoice> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: { order: true, store: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    return invoice;
  }

  /**
   * Generates a sleek, printable HTML invoice template
   */
  async generateInvoiceHtml(invoiceId: string): Promise<string> {
    const invoice = await this.invoiceRepo.findOne({
      where: { id: invoiceId },
      relations: { order: true },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${invoiceId} not found`);
    }

    const rows = (invoice.itemsSnapshot || [])
      .map(
        (it) => `
        <tr>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
            <strong>${it.productTitle}</strong><br>
            <span style="font-size: 12px; color: #6b7280;">Store: ${it.storeName} | SKU: ${it.sku || 'N/A'}</span>
          </td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${it.quantity}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${invoice.currency} ${Number(it.unitPrice).toFixed(2)}</td>
          <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">${invoice.currency} ${Number(it.totalPrice).toFixed(2)}</td>
        </tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1f2937; margin: 0; padding: 40px; background-color: #f9fafb; }
    .invoice-card { max-width: 800px; margin: 0 auto; background: #ffffff; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #3b82f6; padding-bottom: 24px; margin-bottom: 24px; }
    .badge-paid { background: #dcfce7; color: #166534; padding: 4px 12px; border-radius: 9999px; font-weight: bold; font-size: 12px; display: inline-block; }
    table { width: 100%; border-collapse: collapse; margin: 24px 0; }
    th { background: #f3f4f6; padding: 12px; text-align: left; font-size: 13px; font-weight: 600; color: #374151; }
    .totals { width: 300px; margin-left: auto; margin-top: 24px; }
    .total-row { display: flex; justify-content: space-between; padding: 6px 0; }
    .grand-total { border-top: 2px solid #e5e7eb; padding-top: 8px; font-weight: bold; font-size: 18px; color: #1d4ed8; }
    @media print { body { padding: 0; background: none; } .invoice-card { box-shadow: none; padding: 0; } }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="header">
      <div>
        <h1 style="margin: 0; color: #1e3a8a; font-size: 24px;">TAX INVOICE</h1>
        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">Invoice #: <strong>${invoice.invoiceNumber}</strong></p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">Order #: <strong>${invoice.order?.orderNumber || invoice.orderId}</strong></p>
        <p style="margin: 4px 0; color: #6b7280; font-size: 14px;">Date: ${new Date(invoice.issuedAt).toLocaleDateString()}</p>
      </div>
      <div style="text-align: right;">
        <span class="badge-paid">PAID</span>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #4b5563;">Payment: Stripe</p>
        <p style="margin: 2px 0 0 0; font-size: 11px; color: #9ca3af;">Ref: ${invoice.paymentReference || 'N/A'}</p>
      </div>
    </div>

    <div style="display: flex; justify-content: space-between; margin-bottom: 24px; font-size: 14px;">
      <div>
        <strong style="color: #374151;">Billed To:</strong>
        <p style="margin: 4px 0;">${invoice.customerName}</p>
        <p style="margin: 4px 0; color: #6b7280;">${invoice.customerEmail}</p>
      </div>
      <div style="text-align: right;">
        <strong style="color: #374151;">Marketplace Platform</strong>
        <p style="margin: 4px 0; color: #6b7280;">Finland Multi-Tenant Marketplace</p>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Item Description</th>
          <th style="text-align: center;">Qty</th>
          <th style="text-align: right;">Unit Price</th>
          <th style="text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="totals">
      <div class="total-row"><span>Subtotal:</span><span>${invoice.currency} ${Number(invoice.subtotal).toFixed(2)}</span></div>
      <div class="total-row"><span>Shipping:</span><span>${invoice.currency} ${Number(invoice.shippingAmount).toFixed(2)}</span></div>
      <div class="total-row"><span>Tax (VAT):</span><span>${invoice.currency} ${Number(invoice.taxAmount).toFixed(2)}</span></div>
      <div class="total-row grand-total"><span>Total Paid:</span><span>${invoice.currency} ${Number(invoice.totalAmount).toFixed(2)}</span></div>
    </div>

    <div style="margin-top: 40px; border-top: 1px solid #e5e7eb; padding-top: 16px; text-align: center; font-size: 12px; color: #9ca3af;">
      Thank you for your business! This is an electronically generated invoice.
    </div>
  </div>
</body>
</html>`;
  }
}
