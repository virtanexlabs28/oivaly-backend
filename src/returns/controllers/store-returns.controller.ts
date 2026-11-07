import {
  Controller,
  Get,
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

import { ReturnsService } from '../returns.service.js';
import { ReturnQueryDto } from '../dto/return-query.dto.js';
import { CurrentStore } from '../../stores/decorators/current-store.decorator.js';
import { StoreContextGuard } from '../../stores/guards/store-context.guard.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';

@ApiTags('2. Seller / Store — Returns Processing')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, StoreContextGuard)
@Controller('store/returns')
export class StoreReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'List return requests belonging to authenticated store' })
  @ApiResponse({ status: 200, description: 'Store returns queue' })
  async findAll(
    @CurrentStore() storeId: string,
    @Query() query: ReturnQueryDto,
  ) {
    return this.returnsService.findAllForStore(storeId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return request details for store' })
  @ApiParam({ name: 'id', description: 'Return request UUID' })
  async findOne(
    @CurrentStore() storeId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.findOneForStore(id, storeId);
  }
}
