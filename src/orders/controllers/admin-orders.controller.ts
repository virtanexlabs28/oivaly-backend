import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { OrdersService } from '../orders.service.js';
import { UpdateOrderStatusDto } from '../dto/update-order-status.dto.js';
import { OrderQueryDto, StoreOrderQueryDto } from '../dto/order-query.dto.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Orders & Fulfillment')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // ── Parent Orders ──────────────────────────────────────────────────────────

  @Get('orders')
  @RequirePermissions('orders.read')
  @ApiOperation({
    summary: 'List All Parent Orders (Admin)',
    description:
      'Platform Admin view of all customer orders across all stores with filters and pagination.',
  })
  @ApiResponse({ status: 200, description: 'Paginated order list' })
  findAllOrders(@Query() query: OrderQueryDto) {
    return this.ordersService.findAllOrdersAdmin(query);
  }

  @Get('orders/:id')
  @RequirePermissions('orders.read')
  @ApiOperation({
    summary: 'Get Parent Order Details (Admin)',
    description: 'Returns full order breakdown including all store orders, items, customer, and reservations.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order details' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  findOneOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneOrderAdmin(id);
  }

  @Patch('orders/:id/status')
  @RequirePermissions('orders.update')
  @ApiOperation({
    summary: 'Update Parent Order Status (Admin)',
    description:
      'Manually updates order status (e.g. to PAID, PROCESSING, CANCELLED). If marked PAID, converts reservations and deducts inventory.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid transition' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  updateOrderStatus(
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.ordersService.updateOrderStatusAdmin(id, dto, actor.sub);
  }

  // ── Store Orders ───────────────────────────────────────────────────────────

  @Get('store-orders')
  @RequirePermissions('orders.read')
  @ApiOperation({
    summary: 'List All Store Orders (Admin)',
    description: 'Platform Admin view of all store fulfillment orders across all stores.',
  })
  @ApiResponse({ status: 200, description: 'Paginated store orders list' })
  findAllStoreOrders(@Query() query: StoreOrderQueryDto) {
    return this.ordersService.findAllStoreOrdersAdmin(query);
  }

  @Get('store-orders/:id')
  @RequirePermissions('orders.read')
  @ApiOperation({
    summary: 'Get Store Order Details (Admin)',
    description: 'Returns detailed information about any store fulfillment order.',
  })
  @ApiParam({ name: 'id', description: 'Store Order UUID' })
  @ApiResponse({ status: 200, description: 'Store order details' })
  @ApiResponse({ status: 404, description: 'Store order not found' })
  findOneStoreOrder(@Param('id', ParseUUIDPipe) id: string) {
    return this.ordersService.findOneStoreOrderAdmin(id);
  }
}
