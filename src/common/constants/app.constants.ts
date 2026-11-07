export const SUPER_ADMIN_ROLE = 'SUPER_ADMIN';
export const STORE_ADMIN_ROLE = 'STORE_ADMIN';
export const CUSTOMER_ROLE = 'CUSTOMER';

export const STORE_ADMIN_DEFAULT_PERMISSIONS = [
  'stores.read',
  'stores.update',
  'products.read',
  'products.create',
  'products.update',
  'products.delete',
  'orders.read',
  'orders.update',
  'returns.read',
] as const;

export const DEFAULT_PERMISSIONS = [
  // Users
  'users.read',
  'users.create',
  'users.update',
  'users.delete',
  // Roles
  'roles.read',
  'roles.create',
  'roles.update',
  'roles.delete',
  // Permissions
  'permissions.read',
  'permissions.create',
  'permissions.update',
  'permissions.delete',
  // Audit
  'audit.read',
  // Stores
  'stores.read',
  'stores.create',
  'stores.update',
  'stores.delete',
  'stores.approve',
  'stores.reject',
  'stores.activate',
  'stores.suspend',
  // Categories (Platform Admin)
  'categories.create',
  'categories.update',
  'categories.delete',
  // Products
  'products.read',
  'products.create',
  'products.update',
  'products.delete',
  'products.approve',
  'products.publish',
  // Orders
  'orders.read',
  'orders.create',
  'orders.update',
  'orders.delete',
  'orders.cancel',
  // Reviews
  'reviews.read',
  'reviews.moderate',
  'reviews.delete',
  // Returns & Withdrawals
  'returns.read',
  'returns.manage',
  // Payouts & Settlement
  'payouts.read',
  'payouts.manage',
  // Platform Settings
  'settings.read',
  'settings.manage',
] as const;

export type PermissionKey = (typeof DEFAULT_PERMISSIONS)[number];

