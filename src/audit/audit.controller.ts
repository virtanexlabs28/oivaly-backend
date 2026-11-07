import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { AuditService } from './audit.service.js';
import { AuditLogQueryDto } from './dto/audit-log-query.dto.js';
import { RequirePermissions } from '../common/decorators/permissions.decorator.js';

@ApiTags('1. Platform Admin — Audit Logs')
@ApiBearerAuth()
@Controller('admin/audit-logs')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'List audit logs (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated list of audit logs' })
  findAll(@Query() query: AuditLogQueryDto) {
    return this.auditService.findAll(query);
  }

  @Get(':id')
  @RequirePermissions('audit.read')
  @ApiOperation({ summary: 'Get a single audit log entry' })
  @ApiParam({ name: 'id', description: 'Audit log UUID' })
  @ApiResponse({ status: 200, description: 'Audit log entry' })
  @ApiResponse({ status: 404, description: 'Not found' })
  async findOne(@Param('id') id: string) {
    const log = await this.auditService.findOne(id);
    if (!log) throw new NotFoundException('Audit log not found');
    return log;
  }
}
