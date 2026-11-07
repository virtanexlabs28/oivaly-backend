import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseConnectionService {
  constructor(private readonly dataSource: DataSource) {}

  async checkConnection() {
    if (!this.dataSource || !this.dataSource.isInitialized) {
      return {
        status: 'disconnected',
        databaseConnected: false,
        message: 'DataSource is not initialized or not connected.',
      };
    }

    try {
      const queryResult = await this.dataSource.query(
        'SELECT NOW() as server_time, current_database() as database_name, current_user as db_user, version() as pg_version',
      );
      const row = queryResult[0];

      return {
        status: 'connected',
        databaseConnected: true,
        databaseName: row?.database_name,
        user: row?.db_user,
        serverTime: row?.server_time,
        postgresVersion: row?.pg_version?.split(' on ')[0],
      };
    } catch (error: any) {
      return {
        status: 'error',
        databaseConnected: false,
        message: error.message,
      };
    }
  }
}
