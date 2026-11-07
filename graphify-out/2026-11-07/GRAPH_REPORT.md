# Graph Report - multi-tanent-store-backend  (2026-11-07)

## Corpus Check
- 218 files · ~65,133 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .lock 1)

## Summary
- 2237 nodes · 5809 edges · 103 communities (46 shown, 57 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 257 edges (avg confidence: 0.85)
- Token cost: 1,200 input · 800 output

## Community Hubs (Navigation)
- Admin Product Moderation
- Two-Level Category Hierarchy
- Admin JWT Authentication
- Shopping Cart & Subtotals
- Role & Permission Management
- Artisan Payouts & Escrow
- Customer Identity & Auth
- Returns & Statutory Withdrawal
- Shopping Cart & Subtotals (2)
- Shopping Cart & Subtotals (3)
- Role & Permission Management (2)
- Shopping Cart & Subtotals (4)
- Shopping Cart & Subtotals (5)
- Artisan Payouts & Escrow (2)
- Store Vendor Authentication
- Order Processing & Snapshots
- Customer Identity & Auth (2)
- Admin JWT Authentication (2)
- Order Processing & Snapshots (2)
- Order Processing & Snapshots (3)
- Admin JWT Authentication (3)
- Shopping Cart & Subtotals (6)
- Role & Permission Management (3)
- Store Vendor Authentication (2)
- Telemetry & Observability
- devDependencies Service
- Shopping Cart & Subtotals (7)
- Customer Verified Reviews
- Customer Verified Reviews (2)
- Order Processing & Snapshots (4)
- Customer Verified Reviews (3)
- Platform Global Settings
- Order Processing & Snapshots (5)
- Returns & Statutory Withdrawal (2)
- Customer Identity & Auth (3)
- Order Processing & Snapshots (6)
- Order Processing & Snapshots (7)
- Order Processing & Snapshots (8)
- tsconfig.json Service
- Store Vendor Authentication (3)
- Database Configuration & Connection
- Artisan Payouts & Escrow (3)
- Customer Verified Reviews (4)
- Invoicing & ALV Tax Statements
- Invoicing & ALV Tax Statements (2)
- Order Processing & Snapshots (9)
- Artisan Payouts & Escrow (4)
- Cluster 47 Service
- Order Processing & Snapshots (10)
- Admin JWT Authentication (4)
- Admin JWT Authentication (5)
- Returns & Statutory Withdrawal (3)
- Cluster 52 Service
- Order Processing & Snapshots (11)
- Artisan Payouts & Escrow (5)
- Returns & Statutory Withdrawal (4)
- Invoicing & ALV Tax Statements (3)
- Returns & Statutory Withdrawal (5)
- Customer Verified Reviews (5)
- System Audit Logging
- Invoicing & ALV Tax Statements (4)
- Order Processing & Snapshots (12)
- scripts Service
- Artisan Payouts & Escrow (6)
- Customer Verified Reviews (6)
- Order Processing & Snapshots (13)
- Order Processing & Snapshots (14)
- Artisan Payouts & Escrow (7)
- Customer Verified Reviews (7)
- Cluster 69 Service
- System Audit Logging (2)
- Order Processing & Snapshots (15)
- Order Processing & Snapshots (16)
- Order Processing & Snapshots (17)
- Order Processing & Snapshots (18)
- System Audit Logging (3)
- Customer Identity & Auth (4)
- Order Processing & Snapshots (19)
- Cluster 78 Service
- Customer Verified Reviews (8)
- Store Vendor Authentication (4)
- Role & Permission Management (4)
- Artisan Payouts & Escrow (8)
- Artisan Payouts & Escrow (9)
- .oxlintrc.json Service
- ./tsconfig.json Service
- Customer Identity & Auth (5)
- Order Processing & Snapshots (20)
- Cluster 88 Service
- nest-cli.json Service
- vite-tsconfig-paths@^5.1.4 Service
- Customer Identity & Auth (6)
- Artisan Payouts & Escrow (10)
- Customer Identity & Auth (7)
- Admin JWT Authentication (6)
- Admin JWT Authentication (7)
- Cluster 96 Service
- Admin JWT Authentication (8)
- passport@^0.7.0 Service
- @nestjs/schematics@^12.0.0 Service
- oxlint-tsgolint@^7.0.2001 Service
- @vitest/coverage-v8@^4.1.2 Service

## God Nodes (most connected - your core abstractions)
1. `JwtPayload` - 115 edges
2. `Store` - 114 edges
3. `CurrentUser` - 108 edges
4. `@nestjs/common` - 105 edges
5. `@nestjs/swagger` - 93 edges
6. `RequirePermissions()` - 80 edges
7. `AuditAction` - 78 edges
8. `class-validator` - 57 edges
9. `Order` - 55 edges
10. `typeorm` - 54 edges

## Surprising Connections (you probably didn't know these)
- `LogInput` --references--> `AuditAction`  [EXTRACTED]
  src/audit/audit.service.ts → src/audit/entities/audit-log.entity.ts
- `AuditLogQueryDto` --references--> `AuditAction`  [EXTRACTED]
  src/audit/dto/audit-log-query.dto.ts → src/audit/entities/audit-log.entity.ts
- `AuditLog` --references--> `User`  [EXTRACTED]
  src/audit/entities/audit-log.entity.ts → src/users/entities/user.entity.ts
- `CartItem` --references--> `Product`  [EXTRACTED]
  src/cart/entities/cart-item.entity.ts → src/products/entities/product.entity.ts
- `CartItem` --references--> `ProductVariant`  [EXTRACTED]
  src/cart/entities/cart-item.entity.ts → src/products/entities/product-variant.entity.ts

## Import Cycles
- 2-file cycle: `src/payouts/entities/seller-transaction.entity.ts -> src/payouts/entities/store-payout.entity.ts -> src/payouts/entities/seller-transaction.entity.ts`
- 2-file cycle: `src/cart/entities/cart-item.entity.ts -> src/cart/entities/cart.entity.ts -> src/cart/entities/cart-item.entity.ts`
- 2-file cycle: `src/stores/entities/store-admin.entity.ts -> src/stores/entities/store.entity.ts -> src/stores/entities/store-admin.entity.ts`
- 2-file cycle: `src/audit/entities/audit-log.entity.ts -> src/users/entities/user.entity.ts -> src/audit/entities/audit-log.entity.ts`
- 2-file cycle: `src/orders/entities/inventory-reservation.entity.ts -> src/orders/entities/order.entity.ts -> src/orders/entities/inventory-reservation.entity.ts`
- 2-file cycle: `src/orders/entities/order.entity.ts -> src/orders/entities/store-order.entity.ts -> src/orders/entities/order.entity.ts`
- 2-file cycle: `src/customer-auth/entities/customer-address.entity.ts -> src/users/entities/user.entity.ts -> src/customer-auth/entities/customer-address.entity.ts`
- 2-file cycle: `src/products/entities/product-variant.entity.ts -> src/products/entities/product.entity.ts -> src/products/entities/product-variant.entity.ts`
- 2-file cycle: `src/permissions/entities/role-permission.entity.ts -> src/roles/entities/role.entity.ts -> src/permissions/entities/role-permission.entity.ts`
- 2-file cycle: `src/roles/entities/role.entity.ts -> src/roles/entities/user-role.entity.ts -> src/roles/entities/role.entity.ts`
- 2-file cycle: `src/permissions/entities/permission.entity.ts -> src/permissions/entities/role-permission.entity.ts -> src/permissions/entities/permission.entity.ts`
- 2-file cycle: `src/products/entities/product-image.entity.ts -> src/products/entities/product.entity.ts -> src/products/entities/product-image.entity.ts`
- 2-file cycle: `src/returns/entities/return-request.entity.ts -> src/users/entities/user.entity.ts -> src/returns/entities/return-request.entity.ts`
- 2-file cycle: `src/orders/entities/order-item.entity.ts -> src/orders/entities/store-order.entity.ts -> src/orders/entities/order-item.entity.ts`
- 2-file cycle: `src/products/entities/product.entity.ts -> src/reviews/entities/product-review.entity.ts -> src/products/entities/product.entity.ts`
- 2-file cycle: `src/stores/entities/store-admin.entity.ts -> src/users/entities/user.entity.ts -> src/stores/entities/store-admin.entity.ts`
- 2-file cycle: `src/reviews/entities/product-review.entity.ts -> src/users/entities/user.entity.ts -> src/reviews/entities/product-review.entity.ts`
- 2-file cycle: `src/roles/entities/user-role.entity.ts -> src/users/entities/user.entity.ts -> src/roles/entities/user-role.entity.ts`
- 3-file cycle: `src/orders/entities/inventory-reservation.entity.ts -> src/orders/entities/store-order.entity.ts -> src/orders/entities/order.entity.ts -> src/orders/entities/inventory-reservation.entity.ts`
- 3-file cycle: `src/orders/entities/order.entity.ts -> src/users/entities/user.entity.ts -> src/returns/entities/return-request.entity.ts -> src/orders/entities/order.entity.ts`

## Hyperedges (group relationships)
- **Multi-Tenant Marketplace Core Architecture** — readme_multitenantstorebackend, readme_rbac_foundation, readme_store_onboarding_lifecycle, readme_catalog_categories_inventory, readme_marketplace_commerce_orders [EXTRACTED 0.95]

## Communities (103 total, 57 thin omitted)

### Community 0 - "Admin Product Moderation"
Cohesion: 0.05
Nodes (12): CurrentUser, AdminProductsController, StoreProductsController, CreateProductDto, CreateProductImageDto, CreateProductVariantDto, AdjustVariantInventoryDto, UpdateVariantInventoryDto (+4 more)

### Community 1 - "Two-Level Category Hierarchy"
Cohesion: 0.06
Nodes (10): CategoriesController, CategoriesModule, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto, Category, CategoryStatus (+2 more)

### Community 2 - "Admin JWT Authentication"
Cohesion: 0.08
Nodes (6): RequirePermissions(), AdminUpdateStoreDto, UpdateStoreStatusDto, StoreQueryDto, StoresController, StoresService

### Community 3 - "Shopping Cart & Subtotals"
Cohesion: 0.03
Nodes (61): LogInput, AuditAction, CART_CLEARED, CART_CREATED, CART_ITEM_ADDED, CUSTOMER_ADDRESS_CREATED, CUSTOMER_ADDRESS_DELETED, CUSTOMER_ADDRESS_UPDATED (+53 more)

### Community 4 - "Role & Permission Management"
Cohesion: 0.07
Nodes (5): CreateUserDto, UpdateUserDto, UserQueryDto, UsersController, UsersService

### Community 5 - "Artisan Payouts & Escrow"
Cohesion: 0.08
Nodes (8): AdminPlatformSettingsController, UpdateHoldDaysDto, UpdateMinimumPayoutDto, UpdatePlatformFeeDto, UpdatePlatformSettingDto, PlatformSettings, SETTING_KEYS, PlatformSettingsService

### Community 6 - "Customer Identity & Auth"
Cohesion: 0.07
Nodes (5): CustomerAddressController, CustomerAddressService, CreateAddressDto, UpdateAddressDto, CustomerAddress

### Community 7 - "Returns & Statutory Withdrawal"
Cohesion: 0.07
Nodes (15): ReturnQueryDto, UpdateReturnStatusDto, ReturnRequest, ReturnRequestStatus, APPROVED, COMPLETED, PENDING, REJECTED (+7 more)

### Community 8 - "Shopping Cart & Subtotals (2)"
Cohesion: 0.07
Nodes (32): CartItemDetail, CartSummaryResponse, StoreCartGroup, UpdateStoreOrderStatusDto, ReservationStatus, ACTIVE, CONVERTED, EXPIRED (+24 more)

### Community 9 - "Shopping Cart & Subtotals (3)"
Cohesion: 0.10
Nodes (4): class-transformer, class-validator, @nestjs/swagger, AssignRoleDto

### Community 10 - "Role & Permission Management (2)"
Cohesion: 0.08
Nodes (5): AssignPermissionDto, CreateRoleDto, UpdateRoleDto, RolesController, RolesService

### Community 11 - "Shopping Cart & Subtotals (4)"
Cohesion: 0.12
Nodes (9): @nestjs/core, ObserveInstrument, PERMISSIONS_KEY, IS_PUBLIC_KEY, HttpExceptionFilter, JwtAuthGuard, PermissionsGuard, JwtPayload (+1 more)

### Community 12 - "Shopping Cart & Subtotals (5)"
Cohesion: 0.09
Nodes (4): CartController, CartService, AddCartItemDto, UpdateCartItemDto

### Community 13 - "Artisan Payouts & Escrow (2)"
Cohesion: 0.08
Nodes (15): SellerTransaction, StorePayout, PayoutMethod, BANK_TRANSFER, STRIPE_CONNECT, PayoutStatus, COMPLETED, FAILED (+7 more)

### Community 14 - "Store Vendor Authentication"
Cohesion: 0.08
Nodes (3): StoreLoginDto, StoreSignupDto, StoreAuthController

### Community 15 - "Order Processing & Snapshots"
Cohesion: 0.13
Nodes (4): StoreAdmin, Store, StoreContextGuard, StoreContext

### Community 16 - "Customer Identity & Auth (2)"
Cohesion: 0.09
Nodes (4): CustomerAuthController, CustomerAuthService, LoginCustomerDto, ResetPasswordDto

### Community 17 - "Admin JWT Authentication (2)"
Cohesion: 0.08
Nodes (4): CreatePermissionDto, UpdatePermissionDto, PermissionsController, PermissionsService

### Community 18 - "Order Processing & Snapshots (2)"
Cohesion: 0.10
Nodes (5): typeorm, Product, ProductImage, ProductVariant, PaginatedResult

### Community 19 - "Order Processing & Snapshots (3)"
Cohesion: 0.09
Nodes (3): InventoryReservation, Order, StoreOrder

### Community 20 - "Admin JWT Authentication (3)"
Cohesion: 0.11
Nodes (4): AuthController, AuthService, LoginDto, AuthTokens

### Community 21 - "Shopping Cart & Subtotals (6)"
Cohesion: 0.07
Nodes (16): @nestjs/config, AppModule, ObserveModule, CartModule, CustomerAuthModule, DatabaseModule, NotificationsModule, SentNotificationRecord (+8 more)

### Community 22 - "Role & Permission Management (3)"
Cohesion: 0.09
Nodes (3): Permission, RolePermission, Role

### Community 23 - "Store Vendor Authentication (2)"
Cohesion: 0.12
Nodes (4): @nestjs/jwt, AuditModule, UserRole, User

### Community 24 - "Telemetry & Observability"
Cohesion: 0.07
Nodes (29): dependencies, bcrypt@^6.0.0, class-transformer@^0.5.1, class-validator@^0.15.1, @nestjs/common@^12.0.1, @nestjs/config@^12.0.1, @nestjs/core@^12.0.1, @nestjs/jwt@^12.0.2 (+21 more)

### Community 25 - "devDependencies Service"
Cohesion: 0.07
Nodes (27): devDependencies, @nestjs/cli@^12.0.0, @nestjs/mau@^0.2.6, @nestjs/testing@^12.0.1, oxlint@^1.58.0, prettier@^3.4.2, source-map-support@^0.5.21, supertest@^7.0.0 (+19 more)

### Community 31 - "Platform Global Settings"
Cohesion: 0.13
Nodes (3): UpdateStoreProfileDto, UpdateStoreSettingsDto, StoreProfileController

### Community 34 - "Customer Identity & Auth (3)"
Cohesion: 0.26
Nodes (5): @nestjs/common, @nestjs/typeorm, AuditService, StoreEventPayload, StoreEventsService

### Community 36 - "Order Processing & Snapshots (7)"
Cohesion: 0.13
Nodes (11): InvoicesModule, OrdersModule, PaymentStatus, CANCELLED, FAILED, PENDING, PROCESSING, REFUNDED (+3 more)

### Community 38 - "tsconfig.json Service"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+12 more)

### Community 39 - "Store Vendor Authentication (3)"
Cohesion: 0.22
Nodes (12): bcrypt, CUSTOMER_ROLE, DEFAULT_PERMISSIONS, PermissionKey, STORE_ADMIN_DEFAULT_PERMISSIONS, STORE_ADMIN_ROLE, SUPER_ADMIN_ROLE, CustomerAuthTokens (+4 more)

### Community 40 - "Database Configuration & Connection"
Cohesion: 0.15
Nodes (4): databaseConnectionConfig, DatabaseConnectionController, DatabaseConnectionModule, DatabaseConnectionService

### Community 42 - "Customer Verified Reviews (4)"
Cohesion: 0.15
Nodes (7): ProductReview, ReviewStatus, PENDING, PUBLISHED, REJECTED, PaginatedReviews, ProductReviewSummary

### Community 43 - "Invoicing & ALV Tax Statements"
Cohesion: 0.16
Nodes (6): InvoiceQueryDto, InvoiceStatus, CANCELLED, ISSUED, PAID, REFUNDED

### Community 47 - "Cluster 47 Service"
Cohesion: 0.16
Nodes (3): NewsletterSubscribeDto, MarketplaceQueryDto, ProductQueryDto

### Community 49 - "Admin JWT Authentication (4)"
Cohesion: 0.11
Nodes (17): author, @nestjs/platform-express@^12.0.1, pg@^8.23.1, @scalar/nestjs-api-reference@^1.2.25, stripe@^23.0.0, @types/bcrypt@^6.0.0, description, license (+9 more)

### Community 50 - "Admin JWT Authentication (5)"
Cohesion: 0.15
Nodes (6): @nestjs/passport, passport-jwt, AuthModule, JwtStrategy, JwtRefreshStrategy, JwtRefreshPayload

### Community 52 - "Cluster 52 Service"
Cohesion: 0.12
Nodes (3): AddStoreAdminDto, RejectStoreDto, SuspendStoreDto

### Community 62 - "scripts Service"
Cohesion: 0.14
Nodes (14): scripts, build, deploy, format, lint, start, start:debug, start:dev (+6 more)

### Community 74 - "Order Processing & Snapshots (18)"
Cohesion: 0.22
Nodes (8): 15-Minute Inventory Holds & Pessimistic Write Locking, Phase 3: Catalog, Categories & Inventory, Phase 5: Customer Identity, Address Book & Guest Checkout, Phase 4: Marketplace Commerce & Multi-Vendor Orders, Multi-Tenant Store Backend Architecture, Phase 1: Foundation, RBAC, Database & Audit Logging, Phase 6: Returns, Verified Reviews & Transactional Notifications, Phase 2: Store Onboarding & Tenant Isolation

### Community 77 - "Order Processing & Snapshots (19)"
Cohesion: 0.22
Nodes (9): OrderStatus, CANCELLED, DELIVERED, PAID, PARTIALLY_SHIPPED, PENDING, PROCESSING, REFUNDED (+1 more)

### Community 84 - ".oxlintrc.json Service"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 85 - "./tsconfig.json Service"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, rootDir, exclude, extends, include

### Community 89 - "nest-cli.json Service"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 90 - "vite-tsconfig-paths@^5.1.4 Service"
Cohesion: 0.40
Nodes (4): vite-tsconfig-paths@^5.1.4, vitest@^4.1.2, vite-tsconfig-paths, vitest

### Community 92 - "Artisan Payouts & Escrow (10)"
Cohesion: 0.33
Nodes (6): SalesPeriod, ALL, LAST_30_DAYS, LAST_7_DAYS, THIS_MONTH, TODAY

## Knowledge Gaps
- **135 isolated node(s):** `LOGIN`, `LOGOUT`, `PASSWORD_CHANGED`, `USER_CREATED`, `USER_UPDATED` (+130 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 995 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **57 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@nestjs/common` connect `Customer Identity & Auth (3)` to `Admin Product Moderation`, `Two-Level Category Hierarchy`, `Artisan Payouts & Escrow`, `Returns & Statutory Withdrawal`, `Shopping Cart & Subtotals (2)`, `Shopping Cart & Subtotals (3)`, `Shopping Cart & Subtotals (4)`, `Artisan Payouts & Escrow (2)`, `Order Processing & Snapshots`, `Order Processing & Snapshots (2)`, `Order Processing & Snapshots (3)`, `Shopping Cart & Subtotals (6)`, `Role & Permission Management (3)`, `Store Vendor Authentication (2)`, `Telemetry & Observability`, `Shopping Cart & Subtotals (7)`, `Order Processing & Snapshots (7)`, `Store Vendor Authentication (3)`, `Database Configuration & Connection`, `Customer Verified Reviews (4)`, `Invoicing & ALV Tax Statements`, `Cluster 47 Service`, `Admin JWT Authentication (4)`, `Admin JWT Authentication (5)`, `Cluster 52 Service`, `Customer Verified Reviews (5)`?**
  _High betweenness centrality (0.124) - this node is a cross-community bridge._
- **What connects `LOGIN`, `LOGOUT`, `PASSWORD_CHANGED` to the rest of the system?**
  _135 weakly-connected nodes found - possible missing edges._
- **Should `Admin Product Moderation` be split into smaller, more focused modules?**
  _Cohesion score 0.0509534706331045 - nodes in this community are weakly interconnected._
- **Why does `Store` connect `Order Processing & Snapshots` to `Admin Product Moderation`, `Admin JWT Authentication`, `Returns & Statutory Withdrawal`, `Shopping Cart & Subtotals (2)`, `Artisan Payouts & Escrow (2)`, `Store Vendor Authentication`, `Order Processing & Snapshots (2)`, `Order Processing & Snapshots (3)`, `Store Vendor Authentication (2)`, `Shopping Cart & Subtotals (7)`, `Platform Global Settings`, `Customer Identity & Auth (3)`, `Store Vendor Authentication (3)`, `Artisan Payouts & Escrow (3)`, `Invoicing & ALV Tax Statements (2)`, `Order Processing & Snapshots (9)`, `Artisan Payouts & Escrow (4)`, `Invoicing & ALV Tax Statements (4)`, `Artisan Payouts & Escrow (6)`, `Store Vendor Authentication (4)`?**
  _High betweenness centrality (0.096) - this node is a cross-community bridge._
- **Should `Two-Level Category Hierarchy` be split into smaller, more focused modules?**
  _Cohesion score 0.05754475703324808 - nodes in this community are weakly interconnected._
- **Why does `JwtPayload` connect `Shopping Cart & Subtotals (4)` to `Admin Product Moderation`, `Admin JWT Authentication`, `Role & Permission Management`, `Artisan Payouts & Escrow`, `Customer Identity & Auth`, `Returns & Statutory Withdrawal`, `Shopping Cart & Subtotals (3)`, `Role & Permission Management (2)`, `Shopping Cart & Subtotals (5)`, `Store Vendor Authentication`, `Order Processing & Snapshots`, `Customer Identity & Auth (2)`, `Admin JWT Authentication (2)`, `Admin JWT Authentication (3)`, `Customer Verified Reviews (2)`, `Order Processing & Snapshots (4)`, `Customer Verified Reviews (3)`, `Order Processing & Snapshots (5)`, `Returns & Statutory Withdrawal (2)`, `Customer Identity & Auth (3)`, `Order Processing & Snapshots (6)`, `Order Processing & Snapshots (8)`, `Store Vendor Authentication (3)`, `Order Processing & Snapshots (9)`, `Admin JWT Authentication (5)`, `Returns & Statutory Withdrawal (3)`, `Cluster 52 Service`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Should `Admin JWT Authentication` be split into smaller, more focused modules?**
  _Cohesion score 0.07548076923076923 - nodes in this community are weakly interconnected._