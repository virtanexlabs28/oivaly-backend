import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { ReviewsService } from '../reviews.service.js';
import { ModerateReviewDto } from '../dto/moderate-review.dto.js';
import { ReviewQueryDto } from '../dto/review-query.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from '../../common/guards/permissions.guard.js';
import { RequirePermissions } from '../../common/decorators/permissions.decorator.js';

import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Review Moderation')
@ApiBearerAuth('access-token')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @RequirePermissions('reviews.read')
  @ApiOperation({ summary: 'Platform-wide review queue (paginated with filters)' })
  @ApiResponse({ status: 200, description: 'All product reviews' })
  async findAll(@Query() query: ReviewQueryDto) {
    return this.reviewsService.findAllAdmin(query);
  }

  @Patch(':id/moderate')
  @RequirePermissions('reviews.moderate')
  @ApiOperation({ summary: 'Moderate review (approve/publish or reject)' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  @ApiResponse({ status: 200, description: 'Review moderated successfully' })
  async moderate(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ModerateReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reviewsService.moderate(id, dto, user.sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermissions('reviews.delete')
  @ApiOperation({ summary: 'Remove review violating marketplace policy' })
  @ApiParam({ name: 'id', description: 'Review UUID' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    await this.reviewsService.removeAdmin(id, user.sub);
  }
}
