import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiHeader,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { PaymentsService } from './payments.service.js';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto.js';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('3. Customer — Payments (Stripe)')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Public()
  @Post('create-checkout-session')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Stripe Checkout Session / Payment Link',
    description:
      'Creates a hosted Stripe Checkout session (payment link) for a pending order and returns the URL for payment redirection.',
  })
  @ApiResponse({ status: 200, description: 'Stripe Checkout Session payment link created' })
  @ApiResponse({ status: 400, description: 'Order not found, already paid, or cancelled' })
  createCheckoutSession(
    @Body() dto: CreateCheckoutSessionDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.paymentsService.createCheckoutSession(dto.orderId, user?.sub, dto.returnUrl);
  }

  @Public()
  @Get('verify-session/:sessionId')
  @ApiOperation({
    summary: 'Verify Stripe Checkout Session',
    description:
      'Verifies the payment status of a Stripe Checkout Session by session ID and finalizes the order if paid.',
  })
  @ApiParam({ name: 'sessionId', description: 'Stripe Checkout session ID (cs_...)' })
  @ApiResponse({ status: 200, description: 'Payment verification result and paid order details' })
  verifySession(@Param('sessionId') sessionId: string): Promise<{
    success: boolean;
    order?: any;
    invoice?: any;
    alreadyFinalized?: boolean;
    paymentStatus?: string;
    message?: string;
  }> {
    return this.paymentsService.verifyCheckoutSession(sessionId);
  }

  @Public()
  @Post('create-intent')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Create Stripe PaymentIntent',
    description:
      'Creates a Stripe PaymentIntent for a pending customer order and returns the clientSecret for frontend payment confirmation.',
  })
  @ApiResponse({ status: 200, description: 'Stripe PaymentIntent created with clientSecret' })
  @ApiResponse({ status: 400, description: 'Order not found, already paid, or cancelled' })
  createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @CurrentUser() user?: JwtPayload,
  ) {
    return this.paymentsService.createPaymentIntent(dto.orderId, user?.sub);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe Webhook Listener',
    description:
      'Receives and validates incoming Stripe webhook events (checkout.session.completed, payment_intent.succeeded, payment_intent.payment_failed). Verifies cryptographic signature.',
  })
  @ApiHeader({ name: 'stripe-signature', description: 'Stripe HMAC signature header' })
  @ApiResponse({ status: 200, description: 'Webhook processed' })
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature?: string,
  ) {
    const rawBody = (req as any).rawBody;
    if (!rawBody) {
      if (!signature) {
        return { received: true, note: 'No signature provided; rawBody bypass in dev mode' };
      }
      throw new BadRequestException('Raw request body is required for signature verification');
    }

    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    return this.paymentsService.handleWebhook(rawBody, signature);
  }

  @Public()
  @Get('order/:orderId')
  @ApiOperation({
    summary: 'Get Payment Status by Order ID',
    description: 'Returns the payment transaction status, amount, and Stripe PaymentIntent reference for an order.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Payment status details' })
  @ApiResponse({ status: 404, description: 'Payment record not found' })
  getPaymentByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.getPaymentByOrderId(orderId);
  }

  @Public()
  @Post('simulate-success/:orderId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Simulate Payment Success (Dev / Staging Testing)',
    description:
      'Simulates a successful Stripe payment event: marks order PAID, calculates 10% platform fee, locks 90% seller share for 14 days, and generates tax invoice.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Payment successfully simulated' })
  simulatePaymentSuccess(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.simulatePaymentSuccess(orderId);
  }
}
