import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
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

import { OrdersService } from '../orders.service.js';
import { CheckoutDto } from '../dto/checkout.dto.js';
import { OrderQueryDto } from '../dto/order-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { GuestCheckoutDto } from '../dto/guest-checkout.dto.js';
import type { Request } from 'express';
import { Req } from '@nestjs/common';
import type { JwtPayload } from '../../common/types/auth.types.js';


@ApiTags('3. Customer — Orders & Checkout')
@ApiBearerAuth('access-token')
@Controller('customer')
export class CustomerOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Checkout Customer Cart',
    description:
      'Atomically validates inventory, locks stock, creates Parent Order + Store Orders + OrderItems, holds a 15-minute stock reservation, and empties the cart.',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully in PENDING status' })
  @ApiResponse({ status: 400, description: 'Cart empty, inactive store, or insufficient stock' })
  checkout(@CurrentUser() user: JwtPayload, @Body() dto: CheckoutDto) {
    return this.ordersService.checkout(user.sub, dto);
  }

  @Public()
  @Post('checkout/guest')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Guest Checkout (No Account Required)',
    description:
      'Atomically validates inventory, locks stock, creates Parent Order + Store Orders with guest details, holds a 15-minute reservation, and dispatches confirmation email.',
  })
  @ApiResponse({ status: 201, description: 'Guest order created successfully in PENDING status' })
  @ApiResponse({ status: 400, description: 'Invalid variant, inactive store, or insufficient stock' })
  guestCheckout(@Body() dto: GuestCheckoutDto, @Req() req: Request) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    return this.ordersService.guestCheckout(dto, ip, ua);
  }

  @Public()
  @Get('orders/guest/track')
  @ApiOperation({
    summary: 'Track Guest Order',
    description: 'Retrieve guest order status using orderNumber and guestEmail.',
  })
  @ApiResponse({ status: 200, description: 'Guest order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  trackGuestOrder(
    @Query('orderNumber') orderNumber: string,
    @Query('guestEmail') guestEmail: string,
  ) {
    return this.ordersService.trackGuestOrder(orderNumber, guestEmail);
  }


  @Get('orders')
  @ApiOperation({
    summary: 'List Customer Orders',
    description: 'Returns paginated order history strictly for the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Customer orders list' })
  findOrders(@CurrentUser() user: JwtPayload, @Query() query: OrderQueryDto) {
    return this.ordersService.findCustomerOrders(user.sub, query);
  }

  @Get('orders/:id')
  @ApiOperation({
    summary: 'Get Customer Order Details',
    description: 'Returns single order detail for the authenticated customer.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOneOrderForCustomer(id, user.sub);
  }

  @Post('orders/:id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel Customer Order',
    description:
      'Cancels order if not already shipped or delivered. Automatically releases all active inventory reservations.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order cancelled successfully' })
  @ApiResponse({ status: 400, description: 'Order already shipped, delivered, or cancelled' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.cancelCustomerOrder(id, user.sub);
  }
}
