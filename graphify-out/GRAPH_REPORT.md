# Graph Report - multi-tanent-store-backend  (2026-11-07)

## Corpus Check
- 220 files · ~65,242 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 7 file(s) not represented in the graph (top: (none) 5, .example 1, .lock 1)

## Summary
- 2283 nodes · 5850 edges · 127 communities (47 shown, 80 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 257 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7aa3add5`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CurrentStore
- Two-Level Category Hierarchy
- StoresController
- Shopping Cart & Subtotals
- UsersController
- Artisan Payouts & Escrow
- CustomerAddressController
- returns.service.ts
- Shopping Cart & Subtotals (2)
- Shopping Cart & Subtotals (3)
- Role & Permission Management (2)
- auth.types.ts
- Shopping Cart & Subtotals (5)
- payouts.service.ts
- StoreAuthService
- Order Processing & Snapshots
- Customer Identity & Auth (2)
- Admin JWT Authentication (2)
- Order Processing & Snapshots (2)
- database.module.ts
- Admin JWT Authentication (3)
- app.module.ts
- Role & Permission Management (3)
- Store Vendor Authentication (2)
- Telemetry & Observability
- devDependencies Service
- Shopping Cart & Subtotals (7)
- Customer Verified Reviews
- Customer Verified Reviews (2)
- Order Processing & Snapshots (4)
- ReviewQueryDto
- Platform Global Settings
- Order Processing & Snapshots (5)
- Returns & Statutory Withdrawal (2)
- postgres
- Order Processing & Snapshots (6)
- order.entity.ts
- Order Processing & Snapshots (8)
- tsconfig.json Service
- typeorm
- Database Configuration & Connection
- Artisan Payouts & Escrow (3)
- Customer Verified Reviews (4)
- Invoicing & ALV Tax Statements
- Invoicing & ALV Tax Statements (2)
- Order Processing & Snapshots (9)
- Artisan Payouts & Escrow (4)
- Cluster 47 Service
- Order Processing & Snapshots (10)
- package.json
- Admin JWT Authentication (5)
- Returns & Statutory Withdrawal (3)
- stores.controller.ts
- Order Processing & Snapshots (11)
- Artisan Payouts & Escrow (5)
- Returns & Statutory Withdrawal (4)
- Invoicing & ALV Tax Statements (3)
- Returns & Statutory Withdrawal (5)
- System Audit Logging
- Invoicing & ALV Tax Statements (4)
- Order Processing & Snapshots (12)
- scripts Service
- Artisan Payouts & Escrow (6)
- Order
- Order Processing & Snapshots (13)
- Order Processing & Snapshots (14)
- Store
- CustomerAddress
- ProductsService
- System Audit Logging (2)
- Order Processing & Snapshots (15)
- Order Processing & Snapshots (16)
- Order Processing & Snapshots (17)
- Order Processing & Snapshots (18)
- System Audit Logging (3)
- .reject
- AdminPlatformSettingsController
- Cluster 78 Service
- .log
- SalesQueryDto
- Role & Permission Management (4)
- CreateProductDto
- Artisan Payouts & Escrow (9)
- .oxlintrc.json Service
- ./tsconfig.json Service
- customer-returns.controller.ts
- Order Processing & Snapshots (20)
- Cluster 88 Service
- nest-cli.json Service
- vite-tsconfig-paths@^5.1.4 Service
- store-products.controller.ts
- Artisan Payouts & Escrow (10)
- deploy
- AdminUpdateStoreDto
- auth.controller.ts
- StorePayout
- RegisterCustomerDto
- StoreOrder
- ReturnRequest
- InvoiceQueryDto
- StoreQueryDto
- ReturnQueryDto
- supertest
- UpdateStoreOrderStatusDto
- UpdateReturnStatusDto
- InventoryReservation
- SellerTransaction
- customer-address.controller.ts
- StorePayoutSettings
- UserQueryDto
- PayoutQueryDto
- CreateUserDto
- UpdateUserDto
- platform-settings.service.ts
- AssignRoleDto
- @nestjs/throttler
- @types/pg@^8.23.1
- @types/supertest@^7.0.0

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
- `bootstrap()` --calls--> `PermissionsGuard`  [EXTRACTED]
  src/main.ts → src/common/guards/permissions.guard.ts
- `AuditLog` --references--> `User`  [EXTRACTED]
  src/audit/entities/audit-log.entity.ts → src/users/entities/user.entity.ts
- `AuditLogQueryDto` --references--> `AuditAction`  [EXTRACTED]
  src/audit/dto/audit-log-query.dto.ts → src/audit/entities/audit-log.entity.ts
- `Role` --references--> `UserRole`  [EXTRACTED]
  src/roles/entities/role.entity.ts → src/roles/entities/user-role.entity.ts
- `SellerTransaction` --references--> `Order`  [EXTRACTED]
  src/payouts/entities/seller-transaction.entity.ts → src/orders/entities/order.entity.ts

## Import Cycles
- 2-file cycle: `src/cart/entities/cart-item.entity.ts -> src/cart/entities/cart.entity.ts -> src/cart/entities/cart-item.entity.ts`
- 2-file cycle: `src/payouts/entities/seller-transaction.entity.ts -> src/payouts/entities/store-payout.entity.ts -> src/payouts/entities/seller-transaction.entity.ts`
- 2-file cycle: `src/stores/entities/store-admin.entity.ts -> src/stores/entities/store.entity.ts -> src/stores/entities/store-admin.entity.ts`
- 2-file cycle: `src/stores/entities/store-admin.entity.ts -> src/users/entities/user.entity.ts -> src/stores/entities/store-admin.entity.ts`
- 2-file cycle: `src/reviews/entities/product-review.entity.ts -> src/users/entities/user.entity.ts -> src/reviews/entities/product-review.entity.ts`
- 2-file cycle: `src/audit/entities/audit-log.entity.ts -> src/users/entities/user.entity.ts -> src/audit/entities/audit-log.entity.ts`
- 2-file cycle: `src/customer-auth/entities/customer-address.entity.ts -> src/users/entities/user.entity.ts -> src/customer-auth/entities/customer-address.entity.ts`
- 2-file cycle: `src/roles/entities/user-role.entity.ts -> src/users/entities/user.entity.ts -> src/roles/entities/user-role.entity.ts`
- 2-file cycle: `src/returns/entities/return-request.entity.ts -> src/users/entities/user.entity.ts -> src/returns/entities/return-request.entity.ts`
- 2-file cycle: `src/roles/entities/role.entity.ts -> src/roles/entities/user-role.entity.ts -> src/roles/entities/role.entity.ts`
- 2-file cycle: `src/permissions/entities/role-permission.entity.ts -> src/roles/entities/role.entity.ts -> src/permissions/entities/role-permission.entity.ts`
- 2-file cycle: `src/permissions/entities/permission.entity.ts -> src/permissions/entities/role-permission.entity.ts -> src/permissions/entities/permission.entity.ts`
- 2-file cycle: `src/products/entities/product.entity.ts -> src/reviews/entities/product-review.entity.ts -> src/products/entities/product.entity.ts`
- 2-file cycle: `src/orders/entities/inventory-reservation.entity.ts -> src/orders/entities/order.entity.ts -> src/orders/entities/inventory-reservation.entity.ts`
- 2-file cycle: `src/orders/entities/order.entity.ts -> src/orders/entities/store-order.entity.ts -> src/orders/entities/order.entity.ts`
- 2-file cycle: `src/orders/entities/order-item.entity.ts -> src/orders/entities/store-order.entity.ts -> src/orders/entities/order-item.entity.ts`
- 2-file cycle: `src/products/entities/product-variant.entity.ts -> src/products/entities/product.entity.ts -> src/products/entities/product-variant.entity.ts`
- 2-file cycle: `src/products/entities/product-image.entity.ts -> src/products/entities/product.entity.ts -> src/products/entities/product-image.entity.ts`
- 3-file cycle: `src/orders/entities/order.entity.ts -> src/users/entities/user.entity.ts -> src/reviews/entities/product-review.entity.ts -> src/orders/entities/order.entity.ts`
- 3-file cycle: `src/orders/entities/order.entity.ts -> src/users/entities/user.entity.ts -> src/returns/entities/return-request.entity.ts -> src/orders/entities/order.entity.ts`

## Hyperedges (group relationships)
- **Multi-Tenant Marketplace Core Architecture** — readme_multitenantstorebackend, readme_rbac_foundation, readme_store_onboarding_lifecycle, readme_catalog_categories_inventory, readme_marketplace_commerce_orders [EXTRACTED 0.95]

## Communities (127 total, 80 thin omitted)

### Community 0 - "CurrentStore"
Cohesion: 0.24
Nodes (4): CurrentUser, JwtPayload, StoreProductsController, CurrentStore

### Community 1 - "Two-Level Category Hierarchy"
Cohesion: 0.06
Nodes (10): CategoriesController, CategoriesModule, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto, Category, CategoryStatus (+2 more)

### Community 3 - "Shopping Cart & Subtotals"
Cohesion: 0.03
Nodes (61): LogInput, AuditAction, CART_CLEARED, CART_CREATED, CART_ITEM_ADDED, CUSTOMER_ADDRESS_CREATED, CUSTOMER_ADDRESS_DELETED, CUSTOMER_ADDRESS_UPDATED (+53 more)

### Community 5 - "Artisan Payouts & Escrow"
Cohesion: 0.11
Nodes (6): UpdateHoldDaysDto, UpdateMinimumPayoutDto, UpdatePlatformFeeDto, UpdatePlatformSettingDto, PlatformSettings, PlatformSettingsService

### Community 7 - "returns.service.ts"
Cohesion: 0.24
Nodes (10): ReturnRequestStatus, APPROVED, COMPLETED, PENDING, REJECTED, UNDER_REVIEW, ReturnRequestType, ADMINISTRATIVE_REFUND (+2 more)

### Community 8 - "Shopping Cart & Subtotals (2)"
Cohesion: 0.10
Nodes (22): CartItemDetail, CartSummaryResponse, StoreCartGroup, ReservationStatus, ACTIVE, CONVERTED, EXPIRED, RELEASED (+14 more)

### Community 9 - "Shopping Cart & Subtotals (3)"
Cohesion: 0.14
Nodes (3): class-transformer, class-validator, @nestjs/swagger

### Community 10 - "Role & Permission Management (2)"
Cohesion: 0.08
Nodes (4): CreateRoleDto, UpdateRoleDto, RolesController, RolesService

### Community 11 - "auth.types.ts"
Cohesion: 0.21
Nodes (3): PERMISSIONS_KEY, PermissionsGuard, AssignPermissionDto

### Community 12 - "Shopping Cart & Subtotals (5)"
Cohesion: 0.09
Nodes (4): CartController, CartService, AddCartItemDto, UpdateCartItemDto

### Community 13 - "payouts.service.ts"
Cohesion: 0.18
Nodes (13): PayoutMethod, BANK_TRANSFER, STRIPE_CONNECT, PayoutStatus, COMPLETED, FAILED, PROCESSING, SCHEDULED (+5 more)

### Community 14 - "StoreAuthService"
Cohesion: 0.07
Nodes (4): StoreLoginDto, StoreSignupDto, StoreAuthController, StoreAuthService

### Community 15 - "Order Processing & Snapshots"
Cohesion: 0.13
Nodes (6): @nestjs/common, StoreAdmin, StoreEventPayload, StoreEventsService, StoreContextGuard, StoresModule

### Community 16 - "Customer Identity & Auth (2)"
Cohesion: 0.06
Nodes (7): CustomerAuthController, CustomerAuthService, ForgotPasswordDto, LoginCustomerDto, ResetPasswordDto, UpdateCustomerProfileDto, VerifyEmailDto

### Community 17 - "Admin JWT Authentication (2)"
Cohesion: 0.08
Nodes (4): CreatePermissionDto, UpdatePermissionDto, PermissionsController, PermissionsService

### Community 19 - "database.module.ts"
Cohesion: 0.18
Nodes (3): CartModule, DatabaseModule, ProductVariant

### Community 20 - "Admin JWT Authentication (3)"
Cohesion: 0.11
Nodes (4): AuthController, AuthService, LoginDto, AuthTokens

### Community 21 - "app.module.ts"
Cohesion: 0.07
Nodes (16): @nestjs/schedule, AppModule, ObserveModule, CustomerAuthModule, InvoicesModule, NotificationsModule, OrdersModule, PaymentsModule (+8 more)

### Community 22 - "Role & Permission Management (3)"
Cohesion: 0.10
Nodes (6): @nestjs/jwt, @nestjs/typeorm, AuditModule, Permission, RolePermission, Role

### Community 24 - "Telemetry & Observability"
Cohesion: 0.07
Nodes (28): dependencies, bcrypt@^6.0.0, class-transformer@^0.5.1, class-validator@^0.15.1, @nestjs/common@^12.0.1, @nestjs/config@^12.0.1, @nestjs/core@^12.0.1, @nestjs/jwt@^12.0.2 (+20 more)

### Community 25 - "devDependencies Service"
Cohesion: 0.08
Nodes (25): devDependencies, @nestjs/cli@^12.0.0, @nestjs/schematics@^12.0.0, @nestjs/testing@^12.0.1, oxlint@^1.58.0, oxlint-tsgolint@^7.0.2001, prettier@^3.4.2, source-map-support@^0.5.21 (+17 more)

### Community 28 - "Customer Verified Reviews (2)"
Cohesion: 0.05
Nodes (3): CustomerReviewsController, CreateReviewDto, UpdateReviewDto

### Community 30 - "ReviewQueryDto"
Cohesion: 0.06
Nodes (3): AdminReviewsController, ModerateReviewDto, ReviewQueryDto

### Community 31 - "Platform Global Settings"
Cohesion: 0.13
Nodes (3): UpdateStoreProfileDto, UpdateStoreSettingsDto, StoreProfileController

### Community 34 - "postgres"
Cohesion: 0.07
Nodes (26): build, depends_on, environment, ports, context, dockerfile, postgres, POSTGRES_DB (+18 more)

### Community 36 - "order.entity.ts"
Cohesion: 0.12
Nodes (18): stripe@^23.0.0, stripe, OrderStatus, CANCELLED, DELIVERED, PAID, PARTIALLY_SHIPPED, PENDING (+10 more)

### Community 38 - "tsconfig.json Service"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+12 more)

### Community 39 - "typeorm"
Cohesion: 0.12
Nodes (24): bcrypt, typeorm, AuditService, CUSTOMER_ROLE, DEFAULT_PERMISSIONS, PermissionKey, STORE_ADMIN_DEFAULT_PERMISSIONS, STORE_ADMIN_ROLE (+16 more)

### Community 40 - "Database Configuration & Connection"
Cohesion: 0.16
Nodes (4): databaseConnectionConfig, DatabaseConnectionController, DatabaseConnectionModule, DatabaseConnectionService

### Community 42 - "Customer Verified Reviews (4)"
Cohesion: 0.11
Nodes (9): MarketplaceReviewsController, ProductReview, ReviewStatus, PENDING, PUBLISHED, REJECTED, PaginatedReviews, ProductReviewSummary (+1 more)

### Community 43 - "Invoicing & ALV Tax Statements"
Cohesion: 0.30
Nodes (5): InvoiceStatus, CANCELLED, ISSUED, PAID, REFUNDED

### Community 49 - "package.json"
Cohesion: 0.11
Nodes (17): author, nodemailer@^10.0.14, rxjs@^7.8.1, @scalar/nestjs-api-reference@^1.2.25, @types/passport-local@^1.0.38, description, @nestjs/mau@^0.2.6, license (+9 more)

### Community 50 - "Admin JWT Authentication (5)"
Cohesion: 0.14
Nodes (7): @nestjs/config, @nestjs/passport, passport-jwt, AuthModule, JwtStrategy, JwtRefreshStrategy, SentNotificationRecord

### Community 52 - "stores.controller.ts"
Cohesion: 0.10
Nodes (3): AddStoreAdminDto, RejectStoreDto, SuspendStoreDto

### Community 62 - "scripts Service"
Cohesion: 0.14
Nodes (14): scripts, build, deploy, format, lint, start, start:debug, start:dev (+6 more)

### Community 67 - "Store"
Cohesion: 0.15
Nodes (3): Store, StoreContext, StoresService

### Community 74 - "Order Processing & Snapshots (18)"
Cohesion: 0.22
Nodes (8): 15-Minute Inventory Holds & Pessimistic Write Locking, Phase 3: Catalog, Categories & Inventory, Phase 5: Customer Identity, Address Book & Guest Checkout, Phase 4: Marketplace Commerce & Multi-Vendor Orders, Multi-Tenant Store Backend Architecture, Phase 1: Foundation, RBAC, Database & Audit Logging, Phase 6: Returns, Verified Reviews & Transactional Notifications, Phase 2: Store Onboarding & Tenant Isolation

### Community 82 - "CreateProductDto"
Cohesion: 0.20
Nodes (3): CreateProductDto, CreateProductImageDto, CreateProductVariantDto

### Community 84 - ".oxlintrc.json Service"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 85 - "./tsconfig.json Service"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, rootDir, exclude, extends, include

### Community 86 - "customer-returns.controller.ts"
Cohesion: 0.09
Nodes (7): @nestjs/core, ObserveInstrument, IS_PUBLIC_KEY, HttpExceptionFilter, JwtAuthGuard, bootstrap(), CreatePaymentIntentDto

### Community 89 - "nest-cli.json Service"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 90 - "vite-tsconfig-paths@^5.1.4 Service"
Cohesion: 0.40
Nodes (4): vite-tsconfig-paths@^5.1.4, vitest@^4.1.2, vite-tsconfig-paths, vitest

### Community 91 - "store-products.controller.ts"
Cohesion: 0.16
Nodes (6): NewsletterSubscribeDto, AdjustVariantInventoryDto, UpdateVariantInventoryDto, UpdateProductDto, PaginatedResult, slugify()

### Community 92 - "Artisan Payouts & Escrow (10)"
Cohesion: 0.33
Nodes (6): SalesPeriod, ALL, LAST_30_DAYS, LAST_7_DAYS, THIS_MONTH, TODAY

### Community 93 - "deploy"
Cohesion: 0.18
Nodes (10): build, builder, dockerfilePath, deploy, healthcheckPath, healthcheckTimeout, restartPolicyMaxRetries, restartPolicyType (+2 more)

### Community 95 - "auth.controller.ts"
Cohesion: 0.15
Nodes (3): ChangePasswordDto, RefreshTokenDto, RefreshTokenGuard

## Knowledge Gaps
- **135 isolated node(s):** `ACTIVE`, `INACTIVE`, `BANK_TRANSFER`, `STRIPE_CONNECT`, `COMPLETED` (+130 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 1024 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **80 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JwtPayload` connect `CurrentStore` to `StoresController`, `UsersController`, `Artisan Payouts & Escrow`, `CustomerAddressController`, `Shopping Cart & Subtotals (3)`, `Role & Permission Management (2)`, `auth.types.ts`, `Shopping Cart & Subtotals (5)`, `StoreAuthService`, `Order Processing & Snapshots`, `Customer Identity & Auth (2)`, `Admin JWT Authentication (2)`, `Admin JWT Authentication (3)`, `Customer Verified Reviews (2)`, `Order Processing & Snapshots (4)`, `ReviewQueryDto`, `Order Processing & Snapshots (5)`, `Returns & Statutory Withdrawal (2)`, `Order Processing & Snapshots (6)`, `Order Processing & Snapshots (8)`, `typeorm`, `Invoicing & ALV Tax Statements`, `Order Processing & Snapshots (9)`, `Admin JWT Authentication (5)`, `Returns & Statutory Withdrawal (3)`, `stores.controller.ts`, `.reject`, `AdminPlatformSettingsController`, `customer-returns.controller.ts`, `store-products.controller.ts`, `auth.controller.ts`, `customer-address.controller.ts`?**
  _High betweenness centrality (0.120) - this node is a cross-community bridge._
- **What connects `ACTIVE`, `INACTIVE`, `BANK_TRANSFER` to the rest of the system?**
  _135 weakly-connected nodes found - possible missing edges._
- **Should `Two-Level Category Hierarchy` be split into smaller, more focused modules?**
  _Cohesion score 0.05754475703324808 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `Order Processing & Snapshots` to `Two-Level Category Hierarchy`, `Artisan Payouts & Escrow`, `returns.service.ts`, `Shopping Cart & Subtotals (2)`, `Shopping Cart & Subtotals (3)`, `auth.types.ts`, `payouts.service.ts`, `database.module.ts`, `app.module.ts`, `Role & Permission Management (3)`, `Telemetry & Observability`, `order.entity.ts`, `typeorm`, `Database Configuration & Connection`, `Customer Verified Reviews (4)`, `Invoicing & ALV Tax Statements`, `package.json`, `Admin JWT Authentication (5)`, `stores.controller.ts`, `customer-returns.controller.ts`, `store-products.controller.ts`, `auth.controller.ts`, `customer-address.controller.ts`, `platform-settings.service.ts`?**
  _High betweenness centrality (0.111) - this node is a cross-community bridge._
- **Should `Shopping Cart & Subtotals` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._
- **Why does `Store` connect `Store` to `CurrentStore`, `returns.service.ts`, `Shopping Cart & Subtotals (2)`, `Shopping Cart & Subtotals (3)`, `payouts.service.ts`, `StoreAuthService`, `Order Processing & Snapshots`, `Order Processing & Snapshots (2)`, `database.module.ts`, `app.module.ts`, `Role & Permission Management (3)`, `Store Vendor Authentication (2)`, `Shopping Cart & Subtotals (7)`, `Platform Global Settings`, `typeorm`, `Artisan Payouts & Escrow (3)`, `Invoicing & ALV Tax Statements`, `Invoicing & ALV Tax Statements (2)`, `Order Processing & Snapshots (9)`, `Artisan Payouts & Escrow (4)`, `Invoicing & ALV Tax Statements (4)`, `Artisan Payouts & Escrow (6)`, `store-products.controller.ts`, `StorePayout`, `StoreOrder`, `ReturnRequest`, `InventoryReservation`, `SellerTransaction`, `StorePayoutSettings`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Should `Artisan Payouts & Escrow` be split into smaller, more focused modules?**
  _Cohesion score 0.10795454545454546 - nodes in this community are weakly interconnected._