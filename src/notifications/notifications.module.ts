import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsService } from './notifications.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
