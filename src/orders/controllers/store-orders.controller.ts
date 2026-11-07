import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { OrdersService } from '../orders.service.js';
import { UpdateStoreOrderStatusDto } from '../dto/update-store-order-status.dto.js';
import { StoreOrderQueryDto } from '../dto/order-query.dto.js';
import { StoreContextGuard } from '../../stores/guards/store-context.guard.js';
import { CurrentStore } from '../../stores/decorators/current-store.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';
import type { Store } from '../../stores/entities/store.entity.js';

@ApiTags('2. Seller / Store — Order Fulfillment')
@ApiBearerAuth('access-token')
@UseGuards(StoreContextGuard)
@Controller('store/orders')
export class StoreOrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  @ApiOperation({
    summary: 'List Store Orders',
    description:
      'Returns paginated list of fulfillment orders belonging strictly to the authenticated store. Tenant-isolated.',
  })
  @ApiResponse({ status: 200, description: 'Store orders list' })
  findStoreOrders(
    @CurrentStore() store: Store,
    @Query() query: StoreOrderQueryDto,
  ) {
    return this.ordersService.findStoreOrders(store.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Store Order Details',
    description:
      'Returns fulfillment details, shipping address, and line items for an order belonging to the authenticated store.',
  })
  @ApiParam({ name: 'id', description: 'Store Order UUID' })
  @ApiResponse({ status: 200, description: 'Store order details' })
  @ApiResponse({ status: 404, description: 'Store order not found or belongs to another store' })
  findStoreOrder(
    @CurrentStore() store: Store,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.ordersService.findOneStoreOrder(id, store.id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Update Store Order Fulfillment Status',
    description:
      'Updates the fulfillment status of a store order (e.g. PROCESSING, SHIPPED, DELIVERED, CANCELLED). ' +
      'Automatically synchronizes and rolls up Parent Order status.',
  })
  @ApiParam({ name: 'id', description: 'Store Order UUID' })
  @ApiResponse({ status: 200, description: 'Store order status updated' })
  @ApiResponse({ status: 400, description: 'Invalid state transition' })
  @ApiResponse({ status: 404, description: 'Store order not found' })
  updateStatus(
    @CurrentStore() store: Store,
    @CurrentUser() actor: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreOrderStatusDto,
  ) {
    return this.ordersService.updateStoreOrderStatus(id, store.id, dto, actor.sub);
  }
}
