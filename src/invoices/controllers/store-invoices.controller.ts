import {
  Controller,
  Get,
  Param,
  Query,
  Header,
  ParseUUIDPipe,
  UseGuards,
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
import { StoreContextGuard } from '../../stores/guards/store-context.guard.js';
import { CurrentStore } from '../../stores/decorators/current-store.decorator.js';
import type { Store } from '../../stores/entities/store.entity.js';

@ApiTags('2. Seller / Store — Invoices & Receipts')
@ApiBearerAuth('access-token')
@UseGuards(StoreContextGuard)
@Controller('store/invoices')
export class StoreInvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @ApiOperation({
    summary: 'List Store Invoices',
    description:
      'Returns paginated list of sales invoices containing line items sold strictly by the authenticated store. Tenant-isolated.',
  })
  @ApiResponse({ status: 200, description: 'Store invoices list' })
  findInvoices(
    @CurrentStore() store: Store,
    @Query() query: InvoiceQueryDto,
  ) {
    return this.invoicesService.findStoreInvoices(store.id, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get Store Invoice Details',
    description: 'Returns invoice details scoped strictly to items sold by the authenticated store.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Store invoice details' })
  @ApiResponse({ status: 404, description: 'Invoice not found or contains no items from this store' })
  findById(
    @CurrentStore() store: Store,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.invoicesService.findStoreInvoiceById(id, store.id);
  }

  @Get(':id/html')
  @Header('Content-Type', 'text/html')
  @ApiProduces('text/html')
  @ApiOperation({
    summary: 'Get Printable Store Invoice HTML',
    description: 'Renders printable HTML tax invoice for store records and tax reporting.',
  })
  @ApiParam({ name: 'id', description: 'Invoice UUID' })
  @ApiResponse({ status: 200, description: 'Rendered HTML invoice' })
  async getInvoiceHtml(
    @CurrentStore() store: Store,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    // Validates that store has items in this invoice
    await this.invoicesService.findStoreInvoiceById(id, store.id);
    return this.invoicesService.generateInvoiceHtml(id);
  }
}
