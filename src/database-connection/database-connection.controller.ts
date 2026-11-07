import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DatabaseConnectionService } from './database-connection.service.js';
import { Public } from '../common/decorators/public.decorator.js';

@ApiTags('4. Marketplace & Public — System & Database Health')
@Controller('database')
export class DatabaseConnectionController {
  constructor(private readonly dbService: DatabaseConnectionService) {}

  @Public()
  @Get('status')
  @ApiOperation({ summary: 'Check real-time database connection status & version' })
  @ApiResponse({ status: 200, description: 'Database is healthy and reachable' })
  async getStatus() {
    return this.dbService.checkConnection();
  }

  @Public()
  @Get('health')
  @ApiOperation({ summary: 'Liveness and health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service is alive and healthy' })
  getHealth() {
    return {
      status: 'ok',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
