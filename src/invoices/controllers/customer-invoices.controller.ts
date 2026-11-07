import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';

import { InvoicesService } from '../invoices.service.js';
import { InvoiceQueryDto } from '../dto/invoice-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('3. Customer — Invoices & Receipts')
@ApiBearerAuth('access-token')
@Controller('customer')
export class CustomerInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get('invoices')
  @ApiOperation({
    summary: 'List Customer Invoices',
    description: 'Returns paginated list of tax invoices for authenticated customer.',
  })
  @ApiResponse({ status: 200, description: 'Customer invoices list' })
  findInvoices(
    @CurrentUser() user: JwtPayload,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoicesService.findCustomerInvoices(user.sub, query);
  }

  @Get('orders/:orderId/invoice')
  @ApiOperation({
    summary: 'Get Invoice by Order ID',
    description: 'Retrieves the official tax invoice generated for a specific customer order.',
  })
  @ApiParam({ name: 'orderId', description: 'Order UUID' })
  @ApiResponse({ status: 200, description: 'Order invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findByOrderId(
    @CurrentUser() user: JwtPayload,
    @Param('orderId', ParseUUIDPipe) orderId: string,
  ) {
    return this.invoicesService.findInvoiceByOrderId(orderId, user.sub);
  }

  @Get('invoices/:id')
  @ApiOperation({
    summary: 'Get Customer Invoice Details',
    description: 'Returns structured JSON details of a single customer invoice.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findById(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findCustomerInvoiceById(id, user.sub);
  }

  @Get('invoices/:id/html')
  @Header('Content-Type', 'text/html')
  @ApiProduces('text/html')
  @ApiOperation({
    summary: 'Get Printable HTML Invoice',
    description: 'Renders an official, beautifully styled, responsive HTML invoice suitable for browser printing or saving as PDF.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Rendered HTML invoice' })
  async getInvoiceHtml(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Validates ownership first
    await this.invoicesService.findCustomerInvoiceById(id, user.sub);
    return this.invoicesService.generateInvoiceHtml(id);
  }
}
