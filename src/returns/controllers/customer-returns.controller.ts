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
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import type { Request } from 'express';

import { ReturnsService } from '../returns.service.js';
import { CreateReturnRequestDto } from '../dto/create-return-request.dto.js';
import { ReturnQueryDto } from '../dto/return-query.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('3. Customer — Returns & 14-Day Withdrawal')
@Controller('customer/returns')
export class CustomerReturnsController {
  constructor(private readonly returnsService: ReturnsService) {}

  @Public()
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit 14-Day Consumer Withdrawal or Defect Complaint',
    description:
      'File statutory withdrawal (within 14 days) or complaint. Dispatches durable-medium email receipt.',
  })
  @ApiResponse({ status: 201, description: 'Return request submitted successfully' })
  @ApiResponse({ status: 400, description: '14-day window expired, item exempt, or invalid quantity' })
  async create(
    @CurrentUser() user: JwtPayload | undefined,
    @Body() dto: CreateReturnRequestDto,
    @Req() req: Request,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) ?? req.socket.remoteAddress;
    const ua = req.headers['user-agent'];
    const userId = user?.sub ?? null;
    return this.returnsService.create(userId, dto, ip, ua);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'List customer submitted return requests' })
  @ApiResponse({ status: 200, description: 'Customer returns list' })
  async findAll(
    @CurrentUser() user: JwtPayload,
    @Query() query: ReturnQueryDto,
  ) {
    return this.returnsService.findAllForCustomer(user.sub, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get return request details' })
  @ApiParam({ name: 'id', description: 'Return request UUID' })
  async findOne(
    @CurrentUser() user: JwtPayload,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.returnsService.findOneForCustomer(id, user.sub);
  }
}
