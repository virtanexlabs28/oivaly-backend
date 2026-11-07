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
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

@ApiTags('1. Platform Admin — Invoices & Accounting')
@ApiBearerAuth('access-token')
@Controller('admin/invoices')
export class AdminInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions('orders:read')
  @ApiOperation({
    summary: 'List All Marketplace Invoices',
    description: 'Returns paginated list of tax invoices issued across all stores and customers.',
  })
  @ApiResponse({ status: 200, description: 'All marketplace invoices' })
  findInvoices(@Query() query: InvoiceQueryDto) {
    return this.invoicesService.findAllInvoicesAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('orders:read')
  @ApiOperation({
    summary: 'Get Invoice Details (Admin)',
    description: 'Returns single invoice details across any store.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  findById(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.findInvoiceByIdAdmin(id);
  }

  @Get(':id/html')
  @RequirePermissions('orders:read')
  @Header('Content-Type', 'text/html')
  @ApiProduces('text/html')
  @ApiOperation({
    summary: 'Get Printable Invoice HTML (Admin)',
    description: 'Renders official printable HTML invoice.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Rendered HTML invoice' })
  getInvoiceHtml(@Param('id', ParseUUIDPipe) id: string) {
    return this.invoicesService.generateInvoiceHtml(id);
  }
}
