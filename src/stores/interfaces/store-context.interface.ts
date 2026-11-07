import type { Store } from '../entities/store.entity.js';

export interface StoreContext {
  storeId: string;
  store: Store;
}
