import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleAsyncOptions, TypeOrmModuleOptions } from '@nestjs/typeorm';

export const databaseConnectionConfig: TypeOrmModuleAsyncOptions = {
  inject: [ConfigService],
  useFactory: (config: ConfigService): TypeOrmModuleOptions => {
    const databaseUrl = config.get<string>('DATABASE_URL');
    const useSSL = config.get<string>('DB_SSL', 'false') === 'true';

    const sslConfig = useSSL
      ? { rejectUnauthorized: false }
      : undefined;

    const retryAttempts = parseInt(config.get<string>('DB_RETRY_ATTEMPTS', '1'), 10);
    const retryDelay = parseInt(config.get<string>('DB_RETRY_DELAY', '1000'), 10);

    // If DATABASE_URL is provided (Supabase / any connection string), use it directly
    if (databaseUrl) {
      return {
        type: 'postgres',
        url: databaseUrl,
        ssl: sslConfig,
        autoLoadEntities: true,
        synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
        logging: config.get<string>('DB_LOGGING', 'false') === 'true',
        retryAttempts,
        retryDelay,
        extra: useSSL
          ? { ssl: { rejectUnauthorized: false } }
          : undefined,
      };
    }

    // Otherwise use individual connection variables (local PostgreSQL)
    return {
      type: 'postgres',
      host: config.get<string>('DB_HOST', 'localhost'),
      port: parseInt(config.get<string>('DB_PORT', '5432'), 10),
      username: config.get<string>('DB_USERNAME', 'postgres'),
      password: config.get<string>('DB_PASSWORD', ''),
      database: config.get<string>('DB_NAME', 'postgres'),
      ssl: sslConfig,
      autoLoadEntities: true,
      synchronize: config.get<string>('DB_SYNC', 'true') === 'true',
      logging: config.get<string>('DB_LOGGING', 'false') === 'true',
      retryAttempts,
      retryDelay,
    };
  },
};
