import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

export interface SentNotificationRecord {
  to: string;
  subject: string;
  template: string;
  sentAt: Date;
  payload: Record<string, unknown>;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private transporter: Transporter | null = null;

  private isConfigured = false;
  /** Keep track of sent notifications for testing/auditing */
  public readonly sentHistory: SentNotificationRecord[] = [];

  constructor(private readonly configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST');
    const port = this.configService.get<number>('SMTP_PORT', 587);
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: { user, pass },
      });
      this.isConfigured = true;
      this.logger.log(`SMTP Mailer initialized with host: ${host}:${port}`);
    } else {
      this.logger.log('SMTP not fully configured; notifications will operate in mock/logging mode');
    }
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
    template: string,
    payload: Record<string, unknown> = {},
  ): Promise<boolean> {
    const record: SentNotificationRecord = {
      to,
      subject,
      template,
      sentAt: new Date(),
      payload,
    };
    this.sentHistory.push(record);

    if (this.isConfigured && this.transporter) {
      try {
        const from = this.configService.get<string>(
          'SMTP_FROM',
          'noreply@marketplace.fi',
        );
        await this.transporter.sendMail({
          from,
          to,
          subject,
          html,
        });
        this.logger.log(`[EMAIL DISPATCHED] to="${to}" subject="${subject}" template="${template}"`);
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        this.logger.error(`Failed to send email to ${to}: ${message}`);
        return false;
      }
    } else {
      this.logger.log(
        `[MOCK EMAIL DISPATCH] to="${to}" subject="${subject}" template="${template}"`,
      );
      return true;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CUSTOMER IDENTITY NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────────────────

  async sendCustomerVerificationEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<boolean> {
    const verificationUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token=${token}`;
    const subject = 'Verify your marketplace account';
    const html = `
      <h2>Hei ${name},</h2>
      <p>Thank you for registering on Finland Multi-Vendor Marketplace.</p>
      <p>Please verify your email address by clicking the link below or using your token:</p>
      <p><a href="${verificationUrl}">Verify My Email</a></p>
      <p>Verification Token: <strong>${token}</strong></p>
      <p>This verification link expires in 24 hours.</p>
    `;
    return this.sendEmail(to, subject, html, 'CUSTOMER_VERIFICATION', { name, token });
  }

  async sendPasswordResetEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<boolean> {
    const resetUrl = `${this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token=${token}`;
    const subject = 'Password Reset Request';
    const html = `
      <h2>Hei ${name},</h2>
      <p>A password reset was requested for your account.</p>
      <p>Click the link below or use the token to reset your password:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>Reset Token: <strong>${token}</strong></p>
      <p>This token expires in 1 hour. If you did not request this, you can safely ignore this email.</p>
    `;
    return this.sendEmail(to, subject, html, 'PASSWORD_RESET', { name, token });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. ORDER CONFIRMATION & RECEIPTS
  // ──────────────────────────────────────────────────────────────────────────

  async sendOrderConfirmationEmail(
    to: string,
    orderNumber: string,
    totalAmount: number,
    currency: string,
    itemsCount: number,
  ): Promise<boolean> {
    const subject = `Order Confirmation #${orderNumber}`;
    const html = `
      <h2>Kiitos tilauksestasi! (Thank you for your order!)</h2>
      <p>Your order <strong>#${orderNumber}</strong> has been received and is being processed.</p>
      <p>Total Items: ${itemsCount}</p>
      <p>Total Amount: <strong>${totalAmount.toFixed(2)} ${currency}</strong></p>
      <p>You can track the progress of your order in your customer portal or via email updates.</p>
    `;
    return this.sendEmail(to, subject, html, 'ORDER_CONFIRMATION', {
      orderNumber,
      totalAmount,
      currency,
      itemsCount,
    });
  }

  async sendInvoiceEmail(
    to: string,
    invoiceNumber: string,
    orderNumber: string,
    totalAmount: number,
    currency: string,
  ): Promise<boolean> {
    const subject = `Tax Invoice #${invoiceNumber} for Order #${orderNumber}`;
    const html = `
      <h2>Payment Received — Invoice #${invoiceNumber}</h2>
      <p>Thank you for your payment for order <strong>#${orderNumber}</strong>.</p>
      <p>Total Paid: <strong>${Number(totalAmount).toFixed(2)} ${currency}</strong> via Stripe.</p>
      <p>You can view and download your full printable invoice from your account dashboard.</p>
    `;
    return this.sendEmail(to, subject, html, 'INVOICE_ISSUED', {
      invoiceNumber,
      orderNumber,
      totalAmount,
      currency,
    });
  }

  async sendShippingNotificationEmail(
    to: string,
    orderNumber: string,
    storeOrderNumber: string,
    trackingNumber?: string | null,
  ): Promise<boolean> {
    const subject = `Your order #${orderNumber} has shipped!`;
    const trackingHtml = trackingNumber
      ? `<p>Tracking Number: <strong>${trackingNumber}</strong></p>`
      : '';
    const html = `
      <h2>Your items are on the way!</h2>
      <p>Store Package <strong>#${storeOrderNumber}</strong> for Order <strong>#${orderNumber}</strong> has been shipped.</p>
      ${trackingHtml}
    `;
    return this.sendEmail(to, subject, html, 'SHIPPING_UPDATE', {
      orderNumber,
      storeOrderNumber,
      trackingNumber,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. STATUTORY 14-DAY CONSUMER WITHDRAWAL & COMPLAINT RECEIPTS (Durable Medium)
  // ──────────────────────────────────────────────────────────────────────────

  async sendWithdrawalReceiptEmail(
    to: string,
    requestNumber: string,
    orderNumber: string,
    type: string,
    itemsCount: number,
  ): Promise<boolean> {
    const subject = `Confirmation of ${type} Request #${requestNumber} (Order #${orderNumber})`;
    const html = `
      <h2>Formal Durable-Medium Acknowledgement</h2>
      <p>We hereby acknowledge receipt of your <strong>${type.toLowerCase()}</strong> request regarding Order <strong>#${orderNumber}</strong>.</p>
      <p>Request Reference: <strong>#${requestNumber}</strong></p>
      <p>Timestamp: <strong>${new Date().toISOString()}</strong></p>
      <p>Items involved: ${itemsCount}</p>
      <p>Our merchant support team and vendor will review your submission in compliance with Finnish Consumer Protection legislation (14-day statutory right of withdrawal).</p>
      <p>Keep this email as proof of your submission within the legal withdrawal window.</p>
    `;
    return this.sendEmail(to, subject, html, 'WITHDRAWAL_RECEIPT', {
      requestNumber,
      orderNumber,
      type,
      itemsCount,
    });
  }

  async sendReturnStatusEmail(
    to: string,
    requestNumber: string,
    status: string,
    resolutionNotes?: string | null,
  ): Promise<boolean> {
    const subject = `Update on Return Request #${requestNumber}`;
    const notesHtml = resolutionNotes ? `<p>Notes: ${resolutionNotes}</p>` : '';
    const html = `
      <h2>Status Update on Request #${requestNumber}</h2>
      <p>Your return/complaint request status is now: <strong>${status}</strong>.</p>
      ${notesHtml}
    `;
    return this.sendEmail(to, subject, html, 'RETURN_STATUS_UPDATE', {
      requestNumber,
      status,
      resolutionNotes,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. VENDOR APPLICATION NOTIFICATIONS
  // ──────────────────────────────────────────────────────────────────────────

  async sendVendorApplicationSubmittedEmail(
    to: string,
    storeName: string,
  ): Promise<boolean> {
    const subject = `Store Application Received: ${storeName}`;
    const html = `
      <h2>Store Application Under Review</h2>
      <p>Thank you for submitting your vendor application for <strong>${storeName}</strong>.</p>
      <p>Our compliance team will review your Finnish business credentials (Y-tunnus, VAT, agreement) shortly.</p>
    `;
    return this.sendEmail(to, subject, html, 'VENDOR_APP_SUBMITTED', { storeName });
  }

  async sendVendorApprovalEmail(
    to: string,
    storeName: string,
  ): Promise<boolean> {
    const subject = `Your store application for ${storeName} has been APPROVED!`;
    const html = `
      <h2>Congratulations!</h2>
      <p>Your store application for <strong>${storeName}</strong> has been approved by the platform administrators.</p>
      <p>You can now log in to your vendor dashboard to configure your catalog and fulfill orders.</p>
    `;
    return this.sendEmail(to, subject, html, 'VENDOR_APPROVED', { storeName });
  }

  async sendVendorRejectionEmail(
    to: string,
    storeName: string,
    reason: string,
  ): Promise<boolean> {
    const subject = `Update on your store application for ${storeName}`;
    const html = `
      <h2>Store Application Status</h2>
      <p>Your store application for <strong>${storeName}</strong> was not approved at this time.</p>
      <p>Reason: <strong>${reason}</strong></p>
    `;
    return this.sendEmail(to, subject, html, 'VENDOR_REJECTED', { storeName, reason });
  }
}
