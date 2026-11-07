import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { databaseConnectionConfig } from './database-connection.config.js';
import { DatabaseConnectionService } from './database-connection.service.js';
import { DatabaseConnectionController } from './database-connection.controller.js';

@Module({
  imports: [
    TypeOrmModule.forRootAsync(databaseConnectionConfig),
  ],
  controllers: [DatabaseConnectionController],
  providers: [DatabaseConnectionService],
  exports: [TypeOrmModule, DatabaseConnectionService],
})
export class DatabaseConnectionModule {}
