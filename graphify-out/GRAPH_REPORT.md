# Graph Report - multi-tanent-store-backend  (2026-11-07)

## Corpus Check
- 218 files · ~65,122 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .lock 1)

## Summary
- 2239 nodes · 5809 edges · 114 communities (45 shown, 69 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 257 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7d5108ba`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- CurrentStore
- Two-Level Category Hierarchy
- StoresController
- Shopping Cart & Subtotals
- Role & Permission Management
- Artisan Payouts & Escrow
- Customer Identity & Auth
- returns.service.ts
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
- ProductVariant
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
- typeorm
- Order Processing & Snapshots (6)
- Order
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
- package.json
- Admin JWT Authentication (5)
- Returns & Statutory Withdrawal (3)
- SuspendStoreDto
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
- Store
- Customer Verified Reviews (7)
- ProductsService
- System Audit Logging (2)
- Order Processing & Snapshots (15)
- Order Processing & Snapshots (16)
- Order Processing & Snapshots (17)
- Order Processing & Snapshots (18)
- System Audit Logging (3)
- .reject
- CreatePermissionDto
- Cluster 78 Service
- Customer Verified Reviews (8)
- Store Vendor Authentication (4)
- Role & Permission Management (4)
- CreateProductDto
- Artisan Payouts & Escrow (9)
- .oxlintrc.json Service
- ./tsconfig.json Service
- JwtAuthGuard
- Order Processing & Snapshots (20)
- Cluster 88 Service
- nest-cli.json Service
- vite-tsconfig-paths@^5.1.4 Service
- store-products.controller.ts
- Artisan Payouts & Escrow (10)
- StoreSignupDto
- AdminUpdateStoreDto
- Admin JWT Authentication (7)
- Cluster 96 Service
- Admin JWT Authentication (8)
- StoreOrder
- ReturnRequest
- InvoiceQueryDto
- StoreQueryDto
- ReturnQueryDto
- app.e2e-spec.ts
- UpdateStoreOrderStatusDto
- UpdateReturnStatusDto
- ModerateReviewDto
- StoreLoginDto
- customer-address.controller.ts
- AssignPermissionDto
- NewsletterSubscribeDto

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
- `AuditLog` --references--> `User`  [EXTRACTED]
  src/audit/entities/audit-log.entity.ts → src/users/entities/user.entity.ts
- `AuditLogQueryDto` --references--> `AuditAction`  [EXTRACTED]
  src/audit/dto/audit-log-query.dto.ts → src/audit/entities/audit-log.entity.ts
- `Role` --references--> `UserRole`  [EXTRACTED]
  src/roles/entities/role.entity.ts → src/roles/entities/user-role.entity.ts
- `SellerTransaction` --references--> `Order`  [EXTRACTED]
  src/payouts/entities/seller-transaction.entity.ts → src/orders/entities/order.entity.ts
- `SellerTransaction` --references--> `StoreOrder`  [EXTRACTED]
  src/payouts/entities/seller-transaction.entity.ts → src/orders/entities/store-order.entity.ts

## Import Cycles
- 2-file cycle: `src/payouts/entities/seller-transaction.entity.ts -> src/payouts/entities/store-payout.entity.ts -> src/payouts/entities/seller-transaction.entity.ts`
- 2-file cycle: `src/cart/entities/cart-item.entity.ts -> src/cart/entities/cart.entity.ts -> src/cart/entities/cart-item.entity.ts`
- 2-file cycle: `src/stores/entities/store-admin.entity.ts -> src/stores/entities/store.entity.ts -> src/stores/entities/store-admin.entity.ts`
- 2-file cycle: `src/stores/entities/store-admin.entity.ts -> src/users/entities/user.entity.ts -> src/stores/entities/store-admin.entity.ts`
- 2-file cycle: `src/reviews/entities/product-review.entity.ts -> src/users/entities/user.entity.ts -> src/reviews/entities/product-review.entity.ts`
- 2-file cycle: `src/returns/entities/return-request.entity.ts -> src/users/entities/user.entity.ts -> src/returns/entities/return-request.entity.ts`
- 2-file cycle: `src/customer-auth/entities/customer-address.entity.ts -> src/users/entities/user.entity.ts -> src/customer-auth/entities/customer-address.entity.ts`
- 2-file cycle: `src/roles/entities/user-role.entity.ts -> src/users/entities/user.entity.ts -> src/roles/entities/user-role.entity.ts`
- 2-file cycle: `src/audit/entities/audit-log.entity.ts -> src/users/entities/user.entity.ts -> src/audit/entities/audit-log.entity.ts`
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

## Communities (114 total, 69 thin omitted)

### Community 1 - "Two-Level Category Hierarchy"
Cohesion: 0.06
Nodes (10): CategoriesController, CategoriesModule, CategoriesService, slugify(), CreateCategoryDto, UpdateCategoryDto, Category, CategoryStatus (+2 more)

### Community 2 - "StoresController"
Cohesion: 0.14
Nodes (3): AddStoreAdminDto, RejectStoreDto, StoresController

### Community 3 - "Shopping Cart & Subtotals"
Cohesion: 0.03
Nodes (61): LogInput, AuditAction, CART_CLEARED, CART_CREATED, CART_ITEM_ADDED, CUSTOMER_ADDRESS_CREATED, CUSTOMER_ADDRESS_DELETED, CUSTOMER_ADDRESS_UPDATED (+53 more)

### Community 4 - "Role & Permission Management"
Cohesion: 0.07
Nodes (6): AssignRoleDto, CreateUserDto, UpdateUserDto, UserQueryDto, UsersController, UsersService

### Community 5 - "Artisan Payouts & Escrow"
Cohesion: 0.08
Nodes (8): AdminPlatformSettingsController, UpdateHoldDaysDto, UpdateMinimumPayoutDto, UpdatePlatformFeeDto, UpdatePlatformSettingDto, PlatformSettings, SETTING_KEYS, PlatformSettingsService

### Community 6 - "Customer Identity & Auth"
Cohesion: 0.07
Nodes (4): CustomerAddressController, CustomerAddressService, CreateAddressDto, CustomerAddress

### Community 7 - "returns.service.ts"
Cohesion: 0.23
Nodes (10): ReturnRequestStatus, APPROVED, COMPLETED, PENDING, REJECTED, UNDER_REVIEW, ReturnRequestType, ADMINISTRATIVE_REFUND (+2 more)

### Community 8 - "Shopping Cart & Subtotals (2)"
Cohesion: 0.08
Nodes (31): CartItemDetail, CartSummaryResponse, StoreCartGroup, ReservationStatus, ACTIVE, CONVERTED, EXPIRED, RELEASED (+23 more)

### Community 9 - "Shopping Cart & Subtotals (3)"
Cohesion: 0.11
Nodes (3): class-transformer, class-validator, @nestjs/swagger

### Community 10 - "Role & Permission Management (2)"
Cohesion: 0.08
Nodes (4): CreateRoleDto, UpdateRoleDto, RolesController, RolesService

### Community 11 - "Shopping Cart & Subtotals (4)"
Cohesion: 0.27
Nodes (6): @nestjs/common, @nestjs/core, CurrentUser, PERMISSIONS_KEY, IS_PUBLIC_KEY, JwtPayload

### Community 12 - "Shopping Cart & Subtotals (5)"
Cohesion: 0.09
Nodes (4): CartController, CartService, AddCartItemDto, UpdateCartItemDto

### Community 13 - "Artisan Payouts & Escrow (2)"
Cohesion: 0.08
Nodes (17): @nestjs/schedule@^12.0.2, @nestjs/schedule, SellerTransaction, StorePayout, PayoutMethod, BANK_TRANSFER, STRIPE_CONNECT, PayoutStatus (+9 more)

### Community 15 - "Order Processing & Snapshots"
Cohesion: 0.11
Nodes (6): ReturnsModule, StoreAdmin, StoreEventPayload, StoreEventsService, StoreContextGuard, StoresModule

### Community 16 - "Customer Identity & Auth (2)"
Cohesion: 0.05
Nodes (8): CustomerAuthController, CustomerAuthService, ForgotPasswordDto, LoginCustomerDto, RegisterCustomerDto, ResetPasswordDto, UpdateCustomerProfileDto, VerifyEmailDto

### Community 18 - "Order Processing & Snapshots (2)"
Cohesion: 0.10
Nodes (6): DatabaseModule, Product, ProductImage, ProductsModule, PaginatedResult, ReviewsModule

### Community 20 - "Admin JWT Authentication (3)"
Cohesion: 0.10
Nodes (5): AuthController, AuthService, ChangePasswordDto, LoginDto, AuthTokens

### Community 21 - "Shopping Cart & Subtotals (6)"
Cohesion: 0.10
Nodes (10): ObserveInstrument, ObserveModule, AuthModule, CustomerAuthModule, NotificationsModule, SentNotificationRecord, PermissionsModule, RolesModule (+2 more)

### Community 22 - "Role & Permission Management (3)"
Cohesion: 0.09
Nodes (4): AuditModule, Permission, RolePermission, Role

### Community 24 - "Telemetry & Observability"
Cohesion: 0.07
Nodes (29): dependencies, bcrypt@^6.0.0, class-transformer@^0.5.1, class-validator@^0.15.1, @nestjs/common@^12.0.1, @nestjs/config@^12.0.1, @nestjs/core@^12.0.1, @nestjs/jwt@^12.0.2 (+21 more)

### Community 25 - "devDependencies Service"
Cohesion: 0.07
Nodes (27): devDependencies, @nestjs/cli@^12.0.0, @nestjs/mau@^0.2.6, @nestjs/schematics@^12.0.0, oxlint@^1.58.0, oxlint-tsgolint@^7.0.2001, prettier@^3.4.2, source-map-support@^0.5.21 (+19 more)

### Community 26 - "Shopping Cart & Subtotals (7)"
Cohesion: 0.10
Nodes (4): CartModule, Cart, CartItem, OrdersModule

### Community 31 - "Platform Global Settings"
Cohesion: 0.13
Nodes (3): UpdateStoreProfileDto, UpdateStoreSettingsDto, StoreProfileController

### Community 34 - "typeorm"
Cohesion: 0.37
Nodes (5): @nestjs/jwt, @nestjs/typeorm, typeorm, AuditService, CustomerAuthTokens

### Community 36 - "Order"
Cohesion: 0.06
Nodes (21): InvoicesModule, Order, OrderStatus, CANCELLED, DELIVERED, PAID, PARTIALLY_SHIPPED, PENDING (+13 more)

### Community 38 - "tsconfig.json Service"
Cohesion: 0.10
Nodes (20): compilerOptions, allowSyntheticDefaultImports, declaration, emitDecoratorMetadata, esModuleInterop, experimentalDecorators, incremental, isolatedModules (+12 more)

### Community 39 - "Store Vendor Authentication (3)"
Cohesion: 0.22
Nodes (11): bcrypt, CUSTOMER_ROLE, DEFAULT_PERMISSIONS, PermissionKey, STORE_ADMIN_DEFAULT_PERMISSIONS, STORE_ADMIN_ROLE, SUPER_ADMIN_ROLE, UserStatus (+3 more)

### Community 40 - "Database Configuration & Connection"
Cohesion: 0.15
Nodes (4): databaseConnectionConfig, DatabaseConnectionController, DatabaseConnectionModule, DatabaseConnectionService

### Community 42 - "Customer Verified Reviews (4)"
Cohesion: 0.15
Nodes (7): ProductReview, ReviewStatus, PENDING, PUBLISHED, REJECTED, PaginatedReviews, ProductReviewSummary

### Community 43 - "Invoicing & ALV Tax Statements"
Cohesion: 0.31
Nodes (5): InvoiceStatus, CANCELLED, ISSUED, PAID, REFUNDED

### Community 49 - "package.json"
Cohesion: 0.10
Nodes (19): author, @nestjs/observe@^0.3.0, rxjs@^7.8.1, stripe@^23.0.0, @types/passport-jwt@^4.0.1, @types/passport-local@^1.0.38, description, @types/node@^24.0.0 (+11 more)

### Community 50 - "Admin JWT Authentication (5)"
Cohesion: 0.19
Nodes (6): @nestjs/config, @nestjs/passport, passport-jwt, JwtStrategy, JwtRefreshStrategy, JwtRefreshPayload

### Community 62 - "scripts Service"
Cohesion: 0.14
Nodes (14): scripts, build, deploy, format, lint, start, start:debug, start:dev (+6 more)

### Community 67 - "Store"
Cohesion: 0.14
Nodes (3): Store, StoreContext, StoresService

### Community 74 - "Order Processing & Snapshots (18)"
Cohesion: 0.22
Nodes (8): 15-Minute Inventory Holds & Pessimistic Write Locking, Phase 3: Catalog, Categories & Inventory, Phase 5: Customer Identity, Address Book & Guest Checkout, Phase 4: Marketplace Commerce & Multi-Vendor Orders, Multi-Tenant Store Backend Architecture, Phase 1: Foundation, RBAC, Database & Audit Logging, Phase 6: Returns, Verified Reviews & Transactional Notifications, Phase 2: Store Onboarding & Tenant Isolation

### Community 77 - "CreatePermissionDto"
Cohesion: 0.12
Nodes (3): CreatePermissionDto, UpdatePermissionDto, PermissionsService

### Community 82 - "CreateProductDto"
Cohesion: 0.20
Nodes (3): CreateProductDto, CreateProductImageDto, CreateProductVariantDto

### Community 84 - ".oxlintrc.json Service"
Cohesion: 0.29
Nodes (6): env, node, rules, typescript/no-explicit-any, typescript/no-floating-promises, $schema

### Community 85 - "./tsconfig.json Service"
Cohesion: 0.29
Nodes (6): ./tsconfig.json, compilerOptions, rootDir, exclude, extends, include

### Community 86 - "JwtAuthGuard"
Cohesion: 0.16
Nodes (4): HttpExceptionFilter, JwtAuthGuard, PermissionsGuard, bootstrap()

### Community 89 - "nest-cli.json Service"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 90 - "vite-tsconfig-paths@^5.1.4 Service"
Cohesion: 0.33
Nodes (4): vite-tsconfig-paths@^5.1.4, vitest@^4.1.2, vite-tsconfig-paths, vitest

### Community 91 - "store-products.controller.ts"
Cohesion: 0.23
Nodes (3): AdjustVariantInventoryDto, UpdateVariantInventoryDto, UpdateProductDto

### Community 92 - "Artisan Payouts & Escrow (10)"
Cohesion: 0.33
Nodes (6): SalesPeriod, ALL, LAST_30_DAYS, LAST_7_DAYS, THIS_MONTH, TODAY

### Community 104 - "app.e2e-spec.ts"
Cohesion: 0.29
Nodes (5): @nestjs/testing@^12.0.1, supertest@^7.0.0, @nestjs/testing, supertest, AppModule

## Knowledge Gaps
- **135 isolated node(s):** `ACTIVE`, `INACTIVE`, `BANK_TRANSFER`, `STRIPE_CONNECT`, `COMPLETED` (+130 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 997 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **69 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Store` connect `Store` to `CurrentStore`, `returns.service.ts`, `Shopping Cart & Subtotals (2)`, `Shopping Cart & Subtotals (4)`, `Artisan Payouts & Escrow (2)`, `Order Processing & Snapshots`, `Order Processing & Snapshots (2)`, `ProductVariant`, `Shopping Cart & Subtotals (6)`, `Store Vendor Authentication (2)`, `Shopping Cart & Subtotals (7)`, `Platform Global Settings`, `Store Vendor Authentication (3)`, `Artisan Payouts & Escrow (3)`, `Invoicing & ALV Tax Statements`, `Invoicing & ALV Tax Statements (2)`, `Order Processing & Snapshots (9)`, `Artisan Payouts & Escrow (4)`, `Invoicing & ALV Tax Statements (4)`, `Artisan Payouts & Escrow (6)`, `store-products.controller.ts`, `StoreOrder`, `ReturnRequest`?**
  _High betweenness centrality (0.134) - this node is a cross-community bridge._
- **What connects `ACTIVE`, `INACTIVE`, `BANK_TRANSFER` to the rest of the system?**
  _135 weakly-connected nodes found - possible missing edges._
- **Should `Two-Level Category Hierarchy` be split into smaller, more focused modules?**
  _Cohesion score 0.05754475703324808 - nodes in this community are weakly interconnected._
- **Why does `JwtPayload` connect `Shopping Cart & Subtotals (4)` to `CurrentStore`, `StoresController`, `Role & Permission Management`, `Artisan Payouts & Escrow`, `Customer Identity & Auth`, `Shopping Cart & Subtotals (3)`, `Role & Permission Management (2)`, `Shopping Cart & Subtotals (5)`, `Store Vendor Authentication`, `Order Processing & Snapshots`, `Customer Identity & Auth (2)`, `Admin JWT Authentication (2)`, `Admin JWT Authentication (3)`, `Customer Verified Reviews (2)`, `Order Processing & Snapshots (4)`, `Customer Verified Reviews (3)`, `Order Processing & Snapshots (5)`, `Returns & Statutory Withdrawal (2)`, `typeorm`, `Order Processing & Snapshots (6)`, `Order Processing & Snapshots (8)`, `Store Vendor Authentication (3)`, `Order Processing & Snapshots (9)`, `Admin JWT Authentication (5)`, `Returns & Statutory Withdrawal (3)`, `.reject`, `store-products.controller.ts`, `customer-address.controller.ts`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Should `StoresController` be split into smaller, more focused modules?**
  _Cohesion score 0.13781512605042018 - nodes in this community are weakly interconnected._
- **Why does `@nestjs/common` connect `Shopping Cart & Subtotals (4)` to `Two-Level Category Hierarchy`, `Artisan Payouts & Escrow`, `returns.service.ts`, `Shopping Cart & Subtotals (2)`, `Shopping Cart & Subtotals (3)`, `Artisan Payouts & Escrow (2)`, `Order Processing & Snapshots`, `Order Processing & Snapshots (2)`, `Shopping Cart & Subtotals (6)`, `Role & Permission Management (3)`, `Telemetry & Observability`, `Shopping Cart & Subtotals (7)`, `typeorm`, `Order`, `Store Vendor Authentication (3)`, `Database Configuration & Connection`, `Customer Verified Reviews (4)`, `Invoicing & ALV Tax Statements`, `package.json`, `Admin JWT Authentication (5)`, `Customer Verified Reviews (5)`, `JwtAuthGuard`, `vite-tsconfig-paths@^5.1.4 Service`, `store-products.controller.ts`, `app.e2e-spec.ts`, `customer-address.controller.ts`?**
  _High betweenness centrality (0.099) - this node is a cross-community bridge._
- **Should `Shopping Cart & Subtotals` be split into smaller, more focused modules?**
  _Cohesion score 0.03278688524590164 - nodes in this community are weakly interconnected._