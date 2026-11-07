import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
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
import { PermissionsService } from './permissions.service.js';
import { CreatePermissionDto } from './dto/create-permission.dto.js';
import { UpdatePermissionDto } from './dto/update-permission.dto.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Permissions')
@ApiBearerAuth()
@Controller('admin/permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'List all permissions' })
  findAll() {
    return this.permissionsService.findAll();
  }

  @Post()
  @RequirePermissions('permissions.create')
  @ApiOperation({ summary: 'Create a new permission' })
  @ApiResponse({ status: 201, description: 'Permission created' })
  @ApiResponse({ status: 409, description: 'Permission key already exists' })
  create(@Body() dto: CreatePermissionDto, @CurrentUser() actor: JwtPayload) {
    return this.permissionsService.create(dto, actor.sub);
  }

  @Get(':id')
  @RequirePermissions('permissions.read')
  @ApiOperation({ summary: 'Get permission details' })
  @ApiParam({ name: 'id', description: 'Permission UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.permissionsService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('permissions.update')
  @ApiOperation({ summary: 'Update permission description' })
  @ApiParam({ name: 'id', description: 'Permission UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePermissionDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.permissionsService.update(id, dto, actor.sub);
  }

  @Delete(':id')
  @RequirePermissions('permissions.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a permission' })
  @ApiParam({ name: 'id', description: 'Permission UUID' })
  @ApiResponse({ status: 204, description: 'Permission deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.permissionsService.remove(id, actor.sub);
  }
}
