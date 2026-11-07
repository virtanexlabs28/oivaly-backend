import { Injectable, Logger } from '@nestjs/common';
import type { Store } from '../entities/store.entity.js';

export interface StoreEventPayload {
  storeId: string;
  storeName: string;
  recipientEmail: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class StoreEventsService {
  private readonly logger = new Logger(StoreEventsService.name);

  emitApplicationSubmitted(store: Store, applicant: { name: string; email: string }) {
    this.logger.log(
      `[EVENT: STORE_APPLICATION_SUBMITTED] Store "${store.name}" (${store.id}) submitted by ${applicant.name} <${applicant.email}>`,
    );
    // Hook point: dispatch transactional email to vendor confirming application receipt
    // and notify platform admins of pending application
  }

  emitStoreApproved(store: Store, recipientEmail: string) {
    this.logger.log(
      `[EVENT: STORE_APPROVED] Store "${store.name}" (${store.id}) approved. Notification target: ${recipientEmail}`,
    );
    // Hook point: dispatch transactional approval email with instructions to activate/launch store
  }

  emitStoreRejected(store: Store, reason: string, recipientEmail: string) {
    this.logger.log(
      `[EVENT: STORE_REJECTED] Store "${store.name}" (${store.id}) rejected. Reason: "${reason}". Target: ${recipientEmail}`,
    );
    // Hook point: dispatch transactional rejection email explaining reasons
  }

  emitStoreActivated(store: Store, recipientEmail: string) {
    this.logger.log(
      `[EVENT: STORE_ACTIVATED] Store "${store.name}" (${store.id}) is now ACTIVE. Notification target: ${recipientEmail}`,
    );
    // Hook point: dispatch transactional email confirming store is live
  }

  emitStoreSuspended(store: Store, reason: string, recipientEmail: string) {
    this.logger.log(
      `[EVENT: STORE_SUSPENDED] Store "${store.name}" (${store.id}) suspended. Reason: "${reason}". Target: ${recipientEmail}`,
    );
    // Hook point: dispatch suspension notification email
  }

  emitStoreReactivated(store: Store, recipientEmail: string) {
    this.logger.log(
      `[EVENT: STORE_REACTIVATED] Store "${store.name}" (${store.id}) reactivated. Notification target: ${recipientEmail}`,
    );
    // Hook point: dispatch reactivation notification email
  }
}
