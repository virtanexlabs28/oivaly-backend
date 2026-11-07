import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

import { Payment } from './entities/payment.entity.js';
import { PaymentStatus } from './enums/payment-status.enum.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderStatus } from '../orders/enums/order-status.enum.js';
import { OrdersService } from '../orders/orders.service.js';
import { PayoutsService } from '../payouts/payouts.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private stripe: Stripe | null = null;
  private isStripeConfigured = false;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    private readonly ordersService: OrdersService,
    private readonly payoutsService: PayoutsService,
    private readonly invoicesService: InvoicesService,
    private readonly configService: ConfigService,
  ) {
    const secretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (secretKey && !secretKey.includes('replace_with_your_stripe_secret_key')) {
      this.stripe = new Stripe(secretKey, {
        apiVersion: '2025-02-24.acacia' as any,
      });
      this.isStripeConfigured = true;
      this.logger.log('Stripe SDK initialized with live/test secret key');
    } else {
      this.logger.warn(
        'Stripe secret key not configured or contains placeholder. Operating in test simulation mode.',
      );
    }
  }

  /**
   * Creates a hosted Stripe Checkout Session (Payment Link) for a pending order.
   * Customers use this payment link to pay with cards, Apple Pay, Google Pay, etc.
   */
  async createCheckoutSession(orderId: string, customerId?: string, returnBaseUrl?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        storeOrders: { items: true },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    if (customerId && order.customerId && order.customerId !== customerId) {
      throw new BadRequestException('Order does not belong to the authenticated customer');
    }

    const frontendUrl =
      returnBaseUrl ||
      this.configService.get<string>('FRONTEND_URL', 'http://localhost:4242');
    const currency = (order.currency ?? this.configService.get('STRIPE_CURRENCY', 'usd')).toLowerCase();
    const customerEmail = order.isGuest ? (order.guestEmail ?? undefined) : (order.customer?.email ?? undefined);

    let payment = await this.paymentRepo.findOne({
      where: { orderId: order.id },
    });

    let checkoutSessionUrl: string;
    let sessionId: string;
    let paymentIntentId: string | undefined;

    if (this.isStripeConfigured && this.stripe) {
      try {
        const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
        let itemsSumCents = 0;

        for (const so of order.storeOrders || []) {
          for (const item of so.items || []) {
            const itemUnitCents = Math.round(Number(item.unitPrice) * 100);
            const itemTotalCents = itemUnitCents * Number(item.quantity);
            itemsSumCents += itemTotalCents;
            line_items.push({
              price_data: {
                currency,
                product_data: {
                  name: item.productNameSnapshot || 'Handcrafted Product',
                  description: `Order #${order.orderNumber}`,
                },
                unit_amount: itemUnitCents,
              },
              quantity: Number(item.quantity),
            });
          }
        }

        const totalAmountCents = Math.round(Number(order.totalAmount) * 100);
        const diffCents = totalAmountCents - itemsSumCents;

        if (diffCents > 0) {
          line_items.push({
            price_data: {
              currency,
              product_data: {
                name: 'Shipping & Taxes',
                description: 'Shipping and tax fees',
              },
              unit_amount: diffCents,
            },
            quantity: 1,
          });
        } else if (line_items.length === 0 || diffCents < 0) {
          line_items.length = 0;
          line_items.push({
            price_data: {
              currency,
              product_data: {
                name: `Order #${order.orderNumber}`,
                description: `Payment for Order #${order.orderNumber}`,
              },
              unit_amount: totalAmountCents,
            },
            quantity: 1,
          });
        }

        const session = await this.stripe.checkout.sessions.create({
          mode: 'payment',
          customer_email: customerEmail,
          line_items,
          success_url: `${frontendUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}&order_id=${order.id}`,
          cancel_url: `${frontendUrl}/checkout?canceled=true&order_id=${order.id}`,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
          },
          payment_intent_data: {
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
            },
          },
        });

        checkoutSessionUrl = session.url!;
        sessionId = session.id;
        paymentIntentId = typeof session.payment_intent === 'string' ? session.payment_intent : undefined;
      } catch (err: any) {
        this.logger.error(`Stripe Checkout Session creation failed: ${err.message}`, err.stack);
        throw new BadRequestException(`Stripe error: ${err.message}`);
      }
    } else {
      throw new BadRequestException('Stripe secret key is not configured. Please configure STRIPE_SECRET_KEY in .env.');
    }

    if (!payment) {
      payment = this.paymentRepo.create({
        orderId: order.id,
        stripeCheckoutSessionId: sessionId,
        stripePaymentIntentId: paymentIntentId ?? null,
        paymentUrl: checkoutSessionUrl,
        amount: Number(order.totalAmount),
        currency: currency.toUpperCase(),
        status: PaymentStatus.PENDING,
        metadata: {
          orderNumber: order.orderNumber,
          sessionId,
          paymentUrl: checkoutSessionUrl,
          isSimulation: !this.isStripeConfigured,
        },
      });
    } else {
      payment.stripeCheckoutSessionId = sessionId;
      if (paymentIntentId) payment.stripePaymentIntentId = paymentIntentId;
      payment.paymentUrl = checkoutSessionUrl;
      payment.amount = Number(order.totalAmount);
      payment.metadata = {
        ...(payment.metadata || {}),
        orderNumber: order.orderNumber,
        sessionId,
        paymentUrl: checkoutSessionUrl,
      };
    }

    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      paymentUrl: checkoutSessionUrl,
      sessionId,
      amount: Number(order.totalAmount),
      currency: currency.toUpperCase(),
      isSimulation: !this.isStripeConfigured,
    };
  }

  /**
   * Verifies a completed Stripe Checkout session and marks order as paid.
   */
  async verifyCheckoutSession(sessionId: string): Promise<{
    success: boolean;
    order?: Order;
    invoice?: any;
    alreadyFinalized?: boolean;
    paymentStatus?: string;
    message?: string;
  }> {
    if (!sessionId) {
      throw new BadRequestException('Session ID is required');
    }

    if (!this.isStripeConfigured || !this.stripe) {
      throw new BadRequestException('Stripe is not configured on this server.');
    }

    try {
      const session = await this.stripe.checkout.sessions.retrieve(sessionId, {
        expand: ['payment_intent'],
      });

      const orderId = session.metadata?.orderId;
      if (!orderId) {
        throw new BadRequestException('Checkout session does not contain orderId metadata');
      }

      if (session.payment_status === 'paid') {
        const paymentIntent = session.payment_intent as Stripe.PaymentIntent | string;
        const piId = typeof paymentIntent === 'object' ? paymentIntent.id : (paymentIntent || session.id);
        const paymentMethod = typeof paymentIntent === 'object' ? paymentIntent.payment_method_types?.[0] : 'stripe_checkout';

        return await this.finalizeSuccessfulPayment(orderId, piId, paymentMethod || 'stripe_checkout');
      }

      return {
        success: false,
        paymentStatus: session.payment_status,
        message: 'Payment has not been completed yet',
      };
    } catch (err: any) {
      this.logger.error(`Failed to verify checkout session ${sessionId}: ${err.message}`, err.stack);
      throw new BadRequestException(`Stripe verification failed: ${err.message}`);
    }
  }

  /**
   * Creates a Stripe PaymentIntent for a pending customer order.
   * Returns clientSecret for frontend checkout flow.
   */
  async createPaymentIntent(orderId: string, customerId?: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        storeOrders: { items: true },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    if (order.status === OrderStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    if (order.status === OrderStatus.CANCELLED) {
      throw new BadRequestException('Cannot pay for a cancelled order');
    }

    if (customerId && order.customerId && order.customerId !== customerId) {
      throw new BadRequestException('Order does not belong to the authenticated customer');
    }

    const amountInCents = Math.round(Number(order.totalAmount) * 100);
    const currency = (order.currency ?? this.configService.get('STRIPE_CURRENCY', 'usd')).toLowerCase();

    let payment = await this.paymentRepo.findOne({
      where: { orderId: order.id, status: PaymentStatus.PENDING },
    });

    let clientSecret: string;
    let paymentIntentId: string;

    if (this.isStripeConfigured && this.stripe) {
      try {
        if (payment?.stripePaymentIntentId) {
          const pi = await this.stripe.paymentIntents.retrieve(payment.stripePaymentIntentId);
          if (pi.status === 'succeeded') {
            await this.finalizeSuccessfulPayment(order.id, pi.id);
            throw new BadRequestException('Payment for this order has already succeeded');
          }
          clientSecret = pi.client_secret!;
          paymentIntentId = pi.id;
        } else {
          const pi = await this.stripe.paymentIntents.create({
            amount: amountInCents,
            currency,
            metadata: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              customerEmail: order.isGuest ? (order.guestEmail ?? '') : (order.customer?.email ?? ''),
            },
            automatic_payment_methods: { enabled: true },
          });

          clientSecret = pi.client_secret!;
          paymentIntentId = pi.id;
        }
      } catch (err: any) {
        this.logger.error(`Stripe PaymentIntent creation failed: ${err.message}`, err.stack);
        throw new BadRequestException(`Stripe error: ${err.message}`);
      }
    } else {
      const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      paymentIntentId = mockId;
      clientSecret = `${mockId}_secret_${Math.random().toString(36).substring(2, 10)}`;
      this.logger.log(`Created mock PaymentIntent ${paymentIntentId} for order ${order.orderNumber}`);
    }

    if (!payment) {
      payment = this.paymentRepo.create({
        orderId: order.id,
        stripePaymentIntentId: paymentIntentId,
        stripeClientSecret: clientSecret,
        amount: Number(order.totalAmount),
        currency: currency.toUpperCase(),
        status: PaymentStatus.PENDING,
        metadata: {
          orderNumber: order.orderNumber,
          isSimulation: !this.isStripeConfigured,
        },
      });
    } else {
      payment.stripePaymentIntentId = paymentIntentId;
      payment.stripeClientSecret = clientSecret;
      payment.amount = Number(order.totalAmount);
    }

    await this.paymentRepo.save(payment);

    return {
      paymentId: payment.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      clientSecret,
      paymentIntentId,
      amount: Number(order.totalAmount),
      currency: currency.toUpperCase(),
      publishableKey: this.configService.get<string>('STRIPE_PUBLIC_KEY', 'pk_test_sample'),
      isSimulation: !this.isStripeConfigured,
    };
  }

  /**
   * Processes raw Stripe webhook events
   */
  async handleWebhook(rawBody: Buffer, signature: string) {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

    if (!this.isStripeConfigured || !this.stripe || !webhookSecret) {
      this.logger.warn('Received Stripe webhook but Stripe is not fully configured');
      return { received: true, simulated: true };
    }

    let event: Stripe.Event;

    try {
      event = this.stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err: any) {
      this.logger.error(`Webhook signature verification failed: ${err.message}`);
      throw new BadRequestException(`Webhook Error: ${err.message}`);
    }

    this.logger.log(`Processing Stripe webhook event: ${event.type} (${event.id})`);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.orderId;
        const paymentIntentId =
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.id;
        if (orderId && session.payment_status === 'paid') {
          await this.finalizeSuccessfulPayment(orderId, paymentIntentId, 'stripe_checkout');
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.['orderId'];
        if (orderId) {
          await this.finalizeSuccessfulPayment(orderId, pi.id, pi.payment_method_types?.[0]);
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        await this.handlePaymentFailure(pi.id, pi.last_payment_error?.message);
        break;
      }

      default:
        this.logger.log(`Unhandled webhook event type: ${event.type}`);
        break;
    }

    return { received: true };
  }

  /**
   * Finalizes successful payment:
   * 1. Marks Payment status SUCCEEDED
   * 2. Marks Order PAID and converts stock reservations
   * 3. Calculates 10% platform fee and credits 90% to seller pending balance (14-day hold)
   * 4. Generates tax invoice
   */
  async finalizeSuccessfulPayment(orderId: string, paymentIntentId: string, paymentMethod = 'card') {
    const order = await this.orderRepo.findOne({
      where: { id: orderId },
      relations: {
        storeOrders: { items: true },
        customer: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    let payment = await this.paymentRepo.findOne({
      where: { orderId },
    });

    if (order.status === OrderStatus.PAID) {
      this.logger.log(`Order ${order.orderNumber} is already marked as PAID`);
      if (payment && payment.status !== PaymentStatus.SUCCEEDED) {
        payment.status = PaymentStatus.SUCCEEDED;
        await this.paymentRepo.save(payment);
      }
      return {
        success: true,
        order,
        alreadyFinalized: true,
      };
    }

    if (payment) {
      payment.status = PaymentStatus.SUCCEEDED;
      if (paymentIntentId) payment.stripePaymentIntentId = paymentIntentId;
      payment.paymentMethod = paymentMethod;
      await this.paymentRepo.save(payment);
    }

    // 1. Mark Order as PAID (converts stock reservations & moves store orders to PROCESSING)
    const paidOrder = await this.ordersService.markOrderAsPaid(orderId, 'STRIPE', paymentIntentId);

    // 2. Split payment: 10% platform fee cut + 90% seller share with 14-day hold
    await this.payoutsService.recordOrderEarnings(paidOrder);

    // 3. Generate tax invoice & dispatch email
    const invoice = await this.invoicesService.generateOrderInvoice(orderId, paymentIntentId);

    this.logger.log(
      `Order ${paidOrder.orderNumber} successfully paid! Invoice ${invoice.invoiceNumber} generated & seller earnings queued for 14-day clearance.`,
    );

    return {
      success: true,
      order: paidOrder,
      invoice,
    };
  }

  /**
   * Marks payment as failed
   */
  private async handlePaymentFailure(paymentIntentId: string, errorReason?: string) {
    const payment = await this.paymentRepo.findOne({
      where: { stripePaymentIntentId: paymentIntentId },
    });

    if (payment) {
      payment.status = PaymentStatus.FAILED;
      payment.errorMessage = errorReason ?? 'Payment failed';
      await this.paymentRepo.save(payment);
      this.logger.warn(`Payment ${paymentIntentId} marked as FAILED: ${errorReason}`);
    }
  }

  /**
   * Payment simulation is disabled - real Stripe test payment links are enforced.
   */
  async simulatePaymentSuccess(orderId: string) {
    throw new BadRequestException(
      'Payment simulation is disabled. Real Stripe test payment link must be used.',
    );
  }

  /**
   * Get payment details for an order
   */
  async getPaymentByOrderId(orderId: string) {
    const payment = await this.paymentRepo.findOne({
      where: { orderId },
      relations: { order: true },
    });

    if (!payment) {
      throw new NotFoundException(`Payment record for order ${orderId} not found`);
    }

    return payment;
  }
}
