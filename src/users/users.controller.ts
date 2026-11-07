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
import { UsersService } from './users.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { UserQueryDto } from './dto/user-query.dto.js';
import { AssignRoleDto } from './dto/assign-role.dto.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { JwtPayload } from '../common/types/auth.types.js';

@ApiTags('1. Platform Admin — Users')
@ApiBearerAuth()
@Controller('admin/users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'List all users with pagination, search, filter' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  findAll(@Query() query: UserQueryDto) {
    return this.usersService.findAll(query);
  }

  @Post()
  @RequirePermissions('users.create')
  @ApiOperation({ summary: 'Create a new user' })
  @ApiResponse({ status: 201, description: 'User created successfully' })
  @ApiResponse({ status: 409, description: 'Email already exists' })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: JwtPayload) {
    return this.usersService.create(dto, actor.sub);
  }

  @Get(':id')
  @RequirePermissions('users.read')
  @ApiOperation({ summary: 'Get a single user with roles and permissions' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @RequirePermissions('users.update')
  @ApiOperation({ summary: 'Update user name or email' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.update(id, dto, actor.sub);
  }

  @Delete(':id')
  @RequirePermissions('users.delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 204, description: 'User deleted' })
  @ApiResponse({ status: 403, description: 'Cannot delete last SUPER_ADMIN' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.remove(id, actor.sub);
  }

  @Post(':id/activate')
  @RequirePermissions('users.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User activated' })
  activate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.activate(id, actor.sub);
  }

  @Post(':id/deactivate')
  @RequirePermissions('users.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate a user account' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'User deactivated' })
  @ApiResponse({ status: 403, description: 'Cannot deactivate last SUPER_ADMIN' })
  deactivate(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.deactivate(id, actor.sub);
  }

  @Post(':id/roles')
  @RequirePermissions('users.update')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a role to a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiResponse({ status: 200, description: 'Role assigned' })
  @ApiResponse({ status: 400, description: 'Invalid request body or roleId' })
  @ApiResponse({ status: 404, description: 'User or Role not found' })
  @ApiResponse({ status: 409, description: 'User already has this role' })
  assignRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.assignRole(id, dto.roleId, actor.sub);
  }

  @Delete(':id/roles/:roleId')
  @RequirePermissions('users.update')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a role from a user' })
  @ApiParam({ name: 'id', description: 'User UUID' })
  @ApiParam({ name: 'roleId', description: 'Role UUID' })
  @ApiResponse({ status: 204, description: 'Role removed' })
  removeRole(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('roleId', ParseUUIDPipe) roleId: string,
    @CurrentUser() actor: JwtPayload,
  ) {
    return this.usersService.removeRole(id, roleId, actor.sub);
  }
}
