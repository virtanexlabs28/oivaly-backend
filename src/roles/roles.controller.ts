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
import { RolesService } from './roles.service.js';
import { CreateRoleDto } from './dto/create-role.dto.js';
import { UpdateRoleDto } from './dto/update-role.dto.js';
import { AssignPermissionDto } from './dto/assign-permission.dto.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Roles')
@ApiBearerAuth()
@Controller('admin/roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'List all roles with permissions' })
  findAll() {
    return this.rolesService.findAll();
  }

  @Post()
  @RequirePermissions('roles.create')
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  @ApiResponse({ status: 409, description: 'Role name already exists' })
  create(@Body() dto: CreateRoleDto, @CurrentUser() actor: JwtPayload) {
    return this.rolesService.create(dto, actor.sub);
  }

  @Get(':id')
  @RequirePermissions('roles.read')
  @ApiOperation({ summary: 'Get role details including all permissions' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.rolesService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('roles.update')
  @ApiOperation({ summary: 'Update a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.rolesService.update(id, dto, actor.sub);
  }

  @Delete(':id')
  @RequirePermissions('roles.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete SUPER_ADMIN role' })
  remove(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() actor: JwtPayload) {
    return this.rolesService.remove(id, actor.sub);
  }

  @Post(':id/permissions')
  @RequirePermissions('roles.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a permission to a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  assignPermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignPermissionDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.rolesService.assignPermission(id, dto.permissionId, actor.sub);
  }

  @Delete(':id/permissions/:permissionId')
  @RequirePermissions('roles.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a permission from a role' })
  @ApiParam({ name: 'id', description: 'Role UUID' })
  @ApiParam({ name: 'permissionId', description: 'Permission UUID' })
  removePermission(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.rolesService.removePermission(id, permissionId, actor.sub);
  }
}
