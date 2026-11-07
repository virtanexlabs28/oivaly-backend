import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';

import { StoresService } from './stores.service.js';
import { StoreQueryDto } from './dto/store-query.dto.js';
import { RejectStoreDto } from './dto/reject-store.dto.js';
import { SuspendStoreDto } from './dto/suspend-store.dto.js';
import { AddStoreAdminDto } from './dto/add-store-admin.dto.js';
import { AdminUpdateStoreDto, UpdateStoreStatusDto } from './dto/admin-update-store.dto.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Store Management')
@ApiBearerAuth('access-token')
@Controller('admin/stores')
export class StoresController {
  constructor(private readonly storesService: StoresService) {}

  @Get()
  @RequirePermissions('stores.read')
  @ApiOperation({
    summary: 'List All Stores / Applications',
    description:
      'Retrieves a paginated list of stores and vendor applications with optional filtering by status and search keywords.',
  })
  @ApiResponse({ status: 200, description: 'Paginated list of stores' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  findAll(@Query() query: StoreQueryDto) {
    return this.storesService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('stores.read')
  @ApiOperation({
    summary: 'Get Store Application Details',
    description: 'Retrieves full details of a store including associated Store Administrators.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store details' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.storesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('stores.update')
  @ApiOperation({
    summary: 'Update Store Details (Platform Admin)',
    description: 'Updates administrative information, contact details, settings, and lifecycle status for a store.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store updated successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AdminUpdateStoreDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.update(id, dto, actor.sub);
  }

  @Patch(':id/status')
  @RequirePermissions('stores.update')
  @ApiOperation({
    summary: 'Direct Store Status Update (Platform Admin)',
    description: 'Directly changes the lifecycle status of a store to any target status with optional reason.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store status updated successfully' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateStoreStatusDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.updateStatus(id, dto, actor.sub);
  }

  @Post(':id/approve')
  @RequirePermissions('stores.approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Approve Store Application',
    description: 'Transitions a store from UNDER_REVIEW or PENDING to APPROVED status.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store successfully approved' })
  @ApiResponse({ status: 400, description: 'Store is already approved or active' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  approve(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.approve(id, actor.sub);
  }

  @Post(':id/reject')
  @RequirePermissions('stores.reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reject Store Application',
    description: 'Rejects a store application and records the rejection reason.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store successfully rejected' })
  @ApiResponse({ status: 400, description: 'Store is already rejected' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  reject(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RejectStoreDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.reject(id, dto.reason, actor.sub);
  }

  @Post(':id/activate')
  @RequirePermissions('stores.activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Activate / Reactivate Store',
    description: 'Activates an approved store or reactivates a suspended store, granting access to store admin operations.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store activated successfully' })
  @ApiResponse({ status: 400, description: 'Store cannot be activated from current status' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.activate(id, actor.sub);
  }

  @Post(':id/suspend')
  @RequirePermissions('stores.suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Suspend Store',
    description: 'Suspends an active store and blocks store admin dashboard access.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 200, description: 'Store suspended successfully' })
  @ApiResponse({ status: 400, description: 'Store is already suspended' })
  @ApiResponse({ status: 404, description: 'Store not found' })
  suspend(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendStoreDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.suspend(id, dto.reason, actor.sub);
  }

  // ── Store Admin Access Management ────────────────────────────────────

  @Post(':id/admins')
  @RequirePermissions('stores.update')
  @ApiOperation({
    summary: 'Add Store Admin (Platform Admin)',
    description: 'Grants a user store admin access for the specified store.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiResponse({ status: 201, description: 'Store admin added' })
  addStoreAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddStoreAdminDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.addStoreAdmin(id, dto.userId, actor.sub);
  }

  @Delete(':id/admins/:adminId')
  @RequirePermissions('stores.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove Store Admin (Platform Admin)',
    description: 'Revokes store admin access from a user.',
  })
  @ApiParam({ name: 'id', description: 'Store UUID' })
  @ApiParam({ name: 'adminId', description: 'StoreAdmin record UUID' })
  @ApiResponse({ status: 200, description: 'Store admin removed' })
  removeStoreAdmin(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('adminId', ParseUUIDPipe) adminId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.storesService.removeStoreAdmin(id, adminId, actor.sub);
  }
}
