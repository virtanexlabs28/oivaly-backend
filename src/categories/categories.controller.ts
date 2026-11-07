import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { CategoriesService } from './categories.service.js';
import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';
import { CategoryStatus } from './enums/category-status.enum.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('4. Marketplace & Public — Categories Tree')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  // ── Public endpoints ────────────────────────────────────────────────────

  @Get('tree')
  @Public()
  @ApiOperation({
    summary: 'Get Category Tree (Public)',
    description: 'Returns all top-level categories with their subcategories nested. Open to all.',
  })
  @ApiResponse({ status: 200, description: 'Category tree' })
  getTree() {
    return this.categoriesService.findTree();
  }

  @Get()
  @Public()
  @ApiOperation({
    summary: 'List All Categories (Public)',
    description: 'Returns a flat list of all platform-wide categories with optional status filtering.',
  })
  @ApiQuery({ name: 'status', enum: CategoryStatus, required: false })
  @ApiResponse({ status: 200, description: 'Flat list of categories' })
  findAll(@Query('status') status?: CategoryStatus) {
    return this.categoriesService.findAll(status);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get Single Category (Public)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category details' })
  @ApiResponse({ status: 404, description: 'Not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.findOne(id);
  }

  // ── Admin-only endpoints ────────────────────────────────────────────────

  @Post()
  @ApiBearerAuth('access-token')
  @RequirePermissions('categories.create')
  @ApiOperation({
    summary: 'Create Category (Admin)',
    description: 'Platform Admin creates a new platform-wide category or subcategory.',
  })
  @ApiResponse({ status: 201, description: 'Category created' })
  @ApiResponse({ status: 409, description: 'Name conflict' })
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Put(':id')
  @ApiBearerAuth('access-token')
  @RequirePermissions('categories.update')
  @ApiOperation({ summary: 'Update Category (Admin)' })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category updated' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @RequirePermissions('categories.delete')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete Category (Admin)',
    description: 'Deletes a category. Fails if it has active subcategories.',
  })
  @ApiParam({ name: 'id', description: 'Category UUID' })
  @ApiResponse({ status: 200, description: 'Category deleted' })
  @ApiResponse({ status: 400, description: 'Has subcategories' })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.categoriesService.remove(id);
  }
}
