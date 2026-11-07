import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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

import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('3. Customer — Shopping Cart')
@ApiBearerAuth('access-token')
@Controller('customer/cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get or Create Customer Cart',
    description: 'Retrieves or initializes an active shopping cart for the authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Cart retrieved or initialized' })
  getOrCreateCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(user.sub);
  }

  @Get()
  @ApiOperation({
    summary: 'View Customer Cart',
    description:
      'Returns current cart grouped by store with live prices, VAT breakdown, and stock validation.',
  })
  @ApiResponse({ status: 200, description: 'Current cart state' })
  getCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.getCart(user.sub);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Add Item to Cart',
    description:
      'Adds a product variant to the customer cart after validating store status, product publication, and real-time inventory.',
  })
  @ApiResponse({ status: 200, description: 'Item added; updated cart returned' })
  @ApiResponse({ status: 400, description: 'Invalid product, inactive store, or insufficient stock' })
  @ApiResponse({ status: 404, description: 'Product or variant not found' })
  addItem(@CurrentUser() user: JwtPayload, @Body() dto: AddCartItemDto) {
    return this.cartService.addItem(user.sub, dto);
  }

  @Patch('items/:id')
  @ApiOperation({
    summary: 'Update Cart Item Quantity',
    description: 'Updates the quantity of a specific item in the customer cart with real-time stock validation.',
  })
  @ApiParam({ name: 'id', description: 'Cart Item UUID' })
  @ApiResponse({ status: 200, description: 'Item quantity updated; updated cart returned' })
  @ApiResponse({ status: 400, description: 'Insufficient stock or invalid quantity' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  updateItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(user.sub, id, dto);
  }

  @Delete('items/:id')
  @ApiOperation({
    summary: 'Remove Item from Cart',
    description: 'Removes a specific line item from the customer cart.',
  })
  @ApiParam({ name: 'id', description: 'Cart Item UUID' })
  @ApiResponse({ status: 200, description: 'Item removed; updated cart returned' })
  @ApiResponse({ status: 404, description: 'Cart item not found' })
  removeItem(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.cartService.removeItem(user.sub, id);
  }

  @Delete()
  @ApiOperation({
    summary: 'Clear Customer Cart',
    description: 'Removes all items from the authenticated customer cart.',
  })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  clearCart(@CurrentUser() user: JwtPayload) {
    return this.cartService.clearCart(user.sub);
  }
}
