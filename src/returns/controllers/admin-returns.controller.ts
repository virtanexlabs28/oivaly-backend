import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
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
import { UpdateReturnStatusDto } from '../dto/update-return-status.dto.js';
import { ReturnQueryDto } from '../dto/return-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Returns & Disputes')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Get()
  @RequirePermissions('returns.read')
  @ApiOperation({ summary: 'Platform-wide returns & complaints queue' })
  @ApiResponse({ status: 200, description: 'All returns list' })
  async findAll(@Query() query: ReturnQueryDto) {
    return this.returnsService.findAllAdmin(query);
  }

  @Get(':id')
  @RequirePermissions('returns.read')
  @ApiOperation({ summary: 'Get detailed return request breakdown' })
  @ApiParam({ name: 'id', description: 'Return request UUID' })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.returnsService.findOneAdmin(id);
  }

  @Patch(':id/status')
  @RequirePermissions('returns.manage')
  @ApiOperation({ summary: 'Approve, reject, or complete return/withdrawal request' })
  @ApiParam({ name: 'id', description: 'Return request UUID' })
  @ApiResponse({ status: 200, description: 'Return status updated' })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReturnStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.returnsService.updateStatus(id, dto, user.sub);
  }
}
