# 🛒 Multi-Tenant Store Backend — Marketplace Platform API

A modular, enterprise-grade NestJS backend built for a multi-tenant marketplace platform adhering to Finnish and EU eCommerce regulations. Features robust Role-Based Access Control (RBAC), multi-tenant store isolation, two-level category tree, tenant-isolated product catalog with approval workflows, multi-vendor cart & atomic checkout, parent-to-store order hierarchy with historical snapshots and 15-minute inventory reservations, customer identity & address book, unauthenticated guest checkout, 14-day statutory consumer right of withdrawal, verified buyer product reviews, and transactional notifications.

---

## 📑 Table of Contents

- [🚀 Tech Stack](#-tech-stack)
- [📋 System Architecture & Features](#-system-architecture--features)
  - [Phase 1: Foundation, RBAC, Database & Audit Logging](#phase-1-foundation-rbac-database--audit-logging)
  - [Phase 2: Store Onboarding & Tenant Isolation](#phase-2-store-onboarding--tenant-isolation)
  - [Phase 3: Catalog, Categories & Inventory](#phase-3-catalog-categories--inventory)
  - [Phase 4: Marketplace Commerce & Multi-Vendor Orders](#phase-4-marketplace-commerce--multi-vendor-orders)
  - [Phase 5: Customer Identity, Address Book & Guest Checkout](#phase-5-customer-identity-address-book--guest-checkout)
  - [Phase 6: Returns, Verified Reviews & Transactional Notifications](#phase-6-returns-verified-reviews--transactional-notifications)
- [🛠️ Project Structure](#️-project-structure)
- [⚙️ Environment Configuration](#️-environment-configuration)
- [🚦 Getting Started](#-getting-started)
- [🧪 Testing & Quality Assurance](#-testing--quality-assurance)
- [🔑 Default Credentials](#-default-credentials)
- [📡 Complete API Reference](#-complete-api-reference)
  - [🔐 Platform Admin Authentication (`/admin/auth`)](#-platform-admin-authentication-adminauth)
  - [👥 User Management (`/admin/users`)](#-user-management-adminusers)
  - [🛡️ Role Management (`/admin/roles`)](#️-role-management-adminroles)
  - [🔑 Permission Management (`/admin/permissions`)](#-permission-management-adminpermissions)
  - [🏬 Store Application Lifecycle (`/admin/stores`)](#-store-application-lifecycle-adminstores)
  - [📦 Product Approval & Moderation (`/admin/products`)](#-product-approval--moderation-adminproducts)
  - [📑 Parent & Store Order Management (`/admin/orders`, `/admin/store-orders`)](#-parent--store-order-management-adminorders-adminstore-orders)
  - [🔄 Returns & Complaints Administration (`/admin/returns`)](#-returns--complaints-administration-adminreturns)
  - [⭐ Review Moderation (`/admin/reviews`)](#-review-moderation-adminreviews)
  - [📜 Audit Logs (`/admin/audit-logs`)](#-audit-logs-adminaudit-logs)
  - [🏪 Store Admin Authentication & Profile (`/store-auth`, `/store/profile`)](#-store-admin-authentication--profile-store-auth-storeprofile)
  - [📦 Store Product & Inventory Management (`/store/products`)](#-store-product--inventory-management-storeproducts)
  - [🚚 Store Order Fulfillment (`/store/orders`)](#-store-order-fulfillment-storeorders)
  - [🔄 Store Returns Processing (`/store/returns`)](#-store-returns-processing-storereturns)
  - [👤 Customer Account & Authentication (`/customer/auth`)](#-customer-account--authentication-customerauth)
  - [📍 Customer Address Book (`/customer/addresses`)](#-customer-address-book-customeraddresses)
  - [🛒 Customer Cart (`/customer/cart`)](#-customer-cart-customercart)
  - [💳 Customer Checkout & Orders (`/customer/checkout`, `/customer/orders`)](#-customer-checkout--orders-customercheckout-customerorders)
  - [🔄 Customer Returns & Statutory Withdrawal (`/customer/returns`)](#-customer-returns--statutory-withdrawal-customerreturns)
  - [⭐ Customer Verified Reviews (`/customer/reviews`)](#-customer-verified-reviews-customerreviews)
  - [🌐 Public Marketplace Catalog & Health (`/marketplace`, `/categories`, `/database`)](#-public-marketplace-catalog--health-marketplace-categories-database)
- [🔒 Security & Tenant Isolation Rules](#-security--tenant-isolation-rules)
- [📄 License](#-license)

---

## 🚀 Tech Stack

- **Runtime & Package Manager**: [Bun](https://bun.sh/)
- **Framework**: [NestJS](https://nestjs.com/) (Express platform)
- **Database & ORM**: PostgreSQL / Supabase with [TypeORM](https://typeorm.io/)
- **Authentication**: JWT (`@nestjs/jwt`, `passport-jwt`, `bcrypt`)
- **Email Engine**: [Nodemailer](https://nodemailer.com/) with mock console fallback
- **Validation**: `class-validator`, `class-transformer`
- **Rate Limiting**: `@nestjs/throttler`
- **API Documentation**: [Swagger (OpenAPI)](https://swagger.io/) & [Scalar](https://scalar.com/)
- **Testing**: [Vitest](https://vitest.dev/) / Bun Test (70 tests across 8 suites)
- **Code Quality**: TypeScript (strict mode, zero errors), Oxlint

---

## 📋 System Architecture & Features

### Phase 1: Foundation, RBAC, Database & Audit Logging
- **Dynamic Dual-Mode Database Connectivity**:
  - Connects seamlessly via `DATABASE_URL` (direct or pooled Supabase connection with SSL) or discrete local PostgreSQL credentials (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`).
  - Configurable `DB_RETRY_ATTEMPTS` and `DB_RETRY_DELAY` preventing application boot loops.
  - Endpoint: `GET /database/status` for real-time database connection diagnostics.
  - Dedicated CLI connection test: `bun run test:db`.
- **Automatic Database Seeding (`AdminSeed`)**:
  - Seeds **25+ granular system permissions** across `users`, `roles`, `permissions`, and `audit` domains.
  - Creates the default `SUPER_ADMIN` system role and attaches all permissions.
  - Generates initial administrator account (`admin@platform.com` / `Admin@123456`).
- **Platform Admin Auth & Granular RBAC**:
  - Short-lived Access Token (`15m`) and Long-lived Refresh Token (`7d`).
  - Global `JwtAuthGuard` enforcing Bearer tokens (bypassed with `@Public()`).
  - `PermissionsGuard` enforcing `@RequirePermissions('resource.action')`.
  - Built-in guard preventing accidental deletion or deactivation of the last remaining `SUPER_ADMIN`.
- **Immutable Audit Logging**:
  - Persists all administrative mutations with `actorUserId`, `action`, `resource`, `resourceId`, `metadata`, `ipAddress`, `userAgent`, and `createdAt`.

---

### Phase 2: Store Onboarding & Tenant Isolation
- **Vendor Signup & Onboarding (`POST /store-auth/signup`)**:
  - Collects essential business information: store name, legal business name, registered address, contact name, email, phone, Business ID / Y-tunnus, optional VAT ID, and seller agreement acceptance.
  - Managed database transaction: creates User, assigns `STORE_ADMIN` role, creates Store in `UNDER_REVIEW` status, and links them via `StoreAdmin`.
- **Store Application Lifecycle**:
  ```text
  Vendor Signup → UNDER_REVIEW → Platform Admin Review:
                                 ├── Approve → APPROVED → Admin/Vendor Login → ACTIVE
                                 └── Reject  → REJECTED (with documented reason)
  Active Store  → Suspend  → SUSPENDED (with documented reason) → Reactivate → ACTIVE
  ```
- **Store Admin Authentication**:
  - Store login strictly gates access based on store status (`ACTIVE` / `APPROVED` allowed; `UNDER_REVIEW`, `REJECTED`, and `SUSPENDED` rejected with actionable messages).
- **Tenant Isolation Foundation**:
  - `StoreAdmin` entity maps `userId` ↔ `storeId`. Store context is extracted securely from authenticated tokens, preventing Store A from accessing Store B's data (returns `404 Not Found`).

---

### Phase 3: Catalog, Categories & Inventory
- **2-Level Platform Category Tree**:
  - Platform-wide category hierarchy (Root category → Subcategories, maximum 2 levels).
  - Public tree view: `GET /categories/tree`.
- **Product Lifecycle Workflow**:
  ```text
  Store Admin (ACTIVE store) → Creates DRAFT Product + Variants
                             ↓
              Submits for Review → SUBMITTED
                             ↓
         Platform Admin Review → APPROVED or REJECTED (with reason)
                             ↓
        Platform Admin Publishes → PUBLISHED
                             ↓
         Visible on Global Public Marketplace Catalog
  ```
- **Variants & Image Management**:
  - Multiple variants per product with size, color, model, custom attributes, SKU, price, and stock quantity.
  - Multi-image support with primary thumbnail flag.
- **Inventory Control**:
  - Absolute stock updates (`PUT .../inventory`) and atomic delta adjustments (`POST .../inventory/adjust`).
- **Public Marketplace Catalog (`/marketplace`)**:
  - Public search and filtering across PUBLISHED products from ACTIVE stores with category, store, price range, and in-stock filters.

---

### Phase 4: Marketplace Commerce & Multi-Vendor Orders
- **Multi-Vendor Customer Cart (`/customer/cart`)**:
  - Groups cart items by store with individual store subtotals, VAT rates, and taxes.
  - Real-time stock validation prevents adding or keeping out-of-stock items.
- **Parent Order ↔ Store Orders Hierarchy**:
  ```text
  Customer Checkout (Single Session)
          ↓
     Parent Order (Order)
     ├── Store Order A (Store A portion) → Store A Admin fulfills
     │      └── Order Items (historical snapshot of price, SKU, VAT, variant attributes)
     └── Store Order B (Store B portion) → Store B Admin fulfills
            └── Order Items (historical snapshot)
  ```
- **Historical Order Snapshots**:
  - Freezes `productNameSnapshot`, `skuSnapshot`, `variantSnapshot`, `unitPrice`, `vatRate`, `vatIncluded`, `vatCode`, `quantity`, `subtotal`, `taxAmount`, and `total` at checkout time.
- **15-Minute Inventory Holds & Pessimistic Locking**:
  - Checkout executes in a TypeORM database transaction with `pessimistic_write` row locking on `ProductVariant`.
  - Calculates `effectiveAvailable = variant.stockQuantity - SUM(active reservations)`.
  - Creates `InventoryReservation` records with 15-minute expiration (`ReservationStatus.ACTIVE`).
  - Converts to permanent stock deduction upon payment or releases upon order cancellation.
- **Parent Order Status Rollup**:
  - If all Store Orders are `DELIVERED` → Parent Order becomes `DELIVERED`.
  - If some Store Orders are `SHIPPED` → Parent Order becomes `PARTIALLY_SHIPPED`.
  - If all Store Orders are `SHIPPED` → Parent Order becomes `SHIPPED`.
  - If all Store Orders are `CANCELLED` → Parent Order becomes `CANCELLED`.

---

### Phase 5: Customer Identity, Address Book & Guest Checkout
- **Customer Authentication & Lifecycle (`/customer/auth`)**:
  - Customer registration dispatches a 24-hour verification token.
  - Email verification endpoint: `POST /customer/auth/verify-email`.
  - Password reset flow with 1-hour expiration token: `forgot-password` and `reset-password`.
- **Saved Address Book (`/customer/addresses`)**:
  - Customers can save, edit, and manage multiple delivery addresses.
  - Primary default address flag (`isDefault: true`) with automatic sorting.
- **Unauthenticated Guest Checkout (`/customer/checkout/guest`)**:
  - Allows shoppers to checkout directly without registering an account.
  - Generates full Parent Order + Store Orders with 15-minute inventory holds.
  - Dispatches transactional order confirmation email to `guestEmail`.
  - Guest order status tracking endpoint: `GET /customer/orders/guest/track?orderNumber=...&guestEmail=...`.

---

### Phase 6: Returns, Verified Reviews & Transactional Notifications
- **14-Day Statutory Consumer Right of Withdrawal (`/customer/returns`)**:
  - Complies with the **Finnish Consumer Protection Act (Kuluttajansuojalaki)**.
  - Validates that consumer withdrawals (`WITHDRAWAL`) are filed within **14 calendar days** of order delivery/creation.
  - Product safety and hygiene exemption: blocks returns for products marked `isReturnEligible: false`.
  - Distinguishes between `WITHDRAWAL`, `COMPLAINT` (defective items), and `ADMINISTRATIVE_REFUND`.
  - Automatically dispatches durable-medium confirmation receipts with reference `RET-YYYYMMDD-XXXX`.
- **Verified Purchaser Reviews & Ratings (`/customer/reviews`, `/marketplace/products/:id/reviews`)**:
  - **Strict Verified Buyer Gating**: Reviews are rejected unless the customer has a confirmed order (`PAID`, `PROCESSING`, `SHIPPED`, `DELIVERED`) containing the specific product.
  - **Duplicate Prevention**: Strictly 1 review per customer per product.
  - **Public Rating Summary**: Calculates average rating (1.0 to 5.0) and star breakdown (5★ to 1★).
  - **Moderation Workflow**: Platform admins can moderate, publish, or remove violating reviews.
- **Transactional Notifications Engine (`NotificationsService`)**:
  - Nodemailer integration supporting production SMTP and local mock/console mode.
  - Dispatches customer verification, password reset, store application notices, order confirmations, shipping updates with tracking numbers, and durable-medium withdrawal receipts.

---

## 🛠️ Project Structure

```text
src/
├── app.module.ts                         # Root application module registering all 18 feature modules
├── main.ts                               # App bootstrap, Swagger, Scalar, Global Pipes & Filters
│
├── common/                               # Architectural primitives & cross-cutting concerns
│   ├── constants/app.constants.ts        # System role names, permission keys & tokens
│   ├── decorators/                       # @CurrentUser, @Public, @RequirePermissions, @CurrentStore
│   ├── filters/http-exception.filter.ts  # Standardized error response filter
│   ├── guards/                           # JwtAuthGuard, PermissionsGuard
│   └── types/auth.types.ts               # JWT payload definitions
│
├── database-connection/                  # Database connectivity module
│   ├── database-connection.config.ts     # PostgreSQL & Supabase TypeORM configuration
│   ├── database-connection.controller.ts # /database/status health check
│   ├── database-connection.service.ts    # Connection test and ping service
│   └── test-connection.ts                # Direct CLI connection verification script
│
├── database/                             # Database lifecycle & seeds
│   ├── database.module.ts
│   └── seeds/admin.seed.ts               # Super Admin & system permissions seeder
│
├── auth/                                 # Platform Admin authentication
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   ├── dto/                              # LoginDto, RefreshDto, ChangePasswordDto
│   └── strategies/jwt.strategy.ts        # Passport JWT extraction & verification
│
├── users/                                # User management & role assignments
│   ├── users.controller.ts
│   ├── users.service.ts
│   ├── dto/                              # CreateUserDto, UpdateUserDto, AssignRoleDto, UserQueryDto
│   ├── entities/user.entity.ts
│   └── enums/user-status.enum.ts
│
├── roles/                                # Platform roles
│   ├── roles.controller.ts
│   ├── roles.service.ts
│   ├── dto/                              # CreateRoleDto, UpdateRoleDto, AssignPermissionDto
│   └── entities/                         # Role, UserRole
│
├── permissions/                          # Granular permission definitions
│   ├── permissions.controller.ts
│   ├── permissions.service.ts
│   ├── dto/                              # CreatePermissionDto, UpdatePermissionDto
│   └── entities/                         # Permission, RolePermission
│
├── audit/                                # Audit logging & administrative activity tracking
│   ├── audit.controller.ts
│   ├── audit.service.ts
│   ├── dto/audit-log-query.dto.ts
│   └── entities/audit-log.entity.ts
│
├── stores/                               # Store lifecycle & tenant management
│   ├── stores.controller.ts              # /admin/stores management
│   ├── stores.service.ts                 # Store approval, suspension & settings
│   ├── guards/store-context.guard.ts     # Multi-tenant isolation guard
│   ├── entities/                         # Store, StoreAdmin, StoreSettings
│   └── enums/store-status.enum.ts        # UNDER_REVIEW, APPROVED, ACTIVE, REJECTED, SUSPENDED
│
├── store-auth/                           # Store Admin onboarding & credentials
│   ├── store-auth.controller.ts          # /store-auth/signup, /store-auth/login, /store-auth/me
│   ├── store-auth.service.ts
│   └── dto/                              # StoreSignupDto, StoreLoginDto
│
├── categories/                           # Platform-wide 2-level category tree
│   ├── categories.controller.ts          # /categories (public tree & admin CRUD)
│   ├── categories.service.ts
│   ├── entities/category.entity.ts
│   └── dto/                              # CreateCategoryDto, UpdateCategoryDto
│
├── products/                             # Store products, variants, images & inventory
│   ├── controllers/                      # StoreProductsController, AdminProductsController, MarketplaceController
│   ├── services/                         # ProductsService, ProductVariantsService, InventoryService
│   ├── entities/                         # Product, ProductVariant, ProductImage
│   └── enums/product-status.enum.ts      # DRAFT, SUBMITTED, APPROVED, REJECTED, PUBLISHED, ARCHIVED
│
├── cart/                                 # Multi-vendor customer shopping cart
│   ├── cart.controller.ts                # /customer/cart
│   ├── cart.service.ts                   # Cart grouping, real-time stock & pricing
│   ├── entities/                         # Cart, CartItem
│   └── dto/                              # AddCartItemDto, UpdateCartItemDto
│
├── orders/                               # Multi-vendor orders, checkout & 15-min reservations
│   ├── controllers/                      # CustomerOrdersController, StoreOrdersController, AdminOrdersController
│   ├── orders.service.ts                 # Checkout transaction, order snapshot & status sync
│   ├── entities/                         # Order, StoreOrder, OrderItem, InventoryReservation
│   └── enums/                            # OrderStatus, StoreOrderStatus, ReservationStatus
│
├── customer-auth/                        # Customer registration, email verification & address book
│   ├── customer-auth.controller.ts       # /customer/auth
│   ├── customer-auth.service.ts          # Customer token verification & password reset
│   ├── customer-address.controller.ts    # /customer/addresses
│   ├── customer-address.service.ts       # Address book management
│   ├── entities/customer-address.entity.ts
│   └── dto/                              # RegisterCustomerDto, VerifyEmailDto, ResetPasswordDto, AddressDto
│
├── returns/                              # 14-day statutory consumer withdrawal & defect complaints
│   ├── controllers/                      # CustomerReturnsController, StoreReturnsController, AdminReturnsController
│   ├── returns.service.ts                # 14-day window validation & refund resolution
│   ├── entities/return-request.entity.ts
│   └── enums/                            # ReturnRequestType, ReturnRequestStatus
│
├── reviews/                              # Verified buyer reviews & star ratings
│   ├── controllers/                      # CustomerReviewsController, AdminReviewsController, MarketplaceReviewsController
│   ├── reviews.service.ts                # Purchase verification gating & rating calculation
│   ├── entities/product-review.entity.ts
│   └── enums/review-status.enum.ts       # PENDING, PUBLISHED, REJECTED
│
└── notifications/                        # Transactional email & durable-medium notices
    ├── notifications.service.ts          # Verification, order confirmation, shipping & withdrawal emails
    └── templates/                        # Email content generators
```

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory based on `.env.example`:

```env
# =============================================================
# LOCAL PostgreSQL (default – used when DATABASE_URL is NOT set)
# =============================================================
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=your_postgres_password_here
DB_NAME=multi-store
DB_SSL=false

# =============================================================
# SUPABASE (uncomment and fill in to switch to Supabase easily)
# Get from: Supabase Dashboard → Settings → Database → Connection String
# Use Transaction pooler (port 6543) or Session pooler (port 5432)
# =============================================================
# DATABASE_URL=postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
# DB_SSL=true

# Schema sync (auto-generates tables; set false in production!)
DB_SYNC=true
DB_LOGGING=false
DB_RETRY_ATTEMPTS=1
DB_RETRY_DELAY=1000

# =============================================================
# INITIAL ADMIN SEEDING (Auto-created on first application boot)
# =============================================================
ADMIN_EMAIL=admin@platform.com
ADMIN_PASSWORD=Admin@123456
ADMIN_NAME="Platform Admin"

# =============================================================
# JWT AUTHENTICATION
# =============================================================
JWT_SECRET=super-secret-jwt-key-replace-in-production-min-32-chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=super-secret-refresh-key-replace-in-production
JWT_REFRESH_EXPIRES_IN=7d

# =============================================================
# APPLICATION & CORS
# =============================================================
PORT=4040
NODE_ENV=development
CORS_ORIGIN=*
FRONTEND_URL=http://localhost:3000

# =============================================================
# RATE LIMITING (requests per TTL window in milliseconds)
# =============================================================
THROTTLE_TTL=60000
THROTTLE_LIMIT=60

# =============================================================
# TRANSACTIONAL EMAIL / SMTP (Nodemailer)
# (Leave empty to use built-in mock/console logging mode)
# =============================================================
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM="Finland Marketplace" <noreply@marketplace.fi>

# =============================================================
# OBSERVABILITY (Optional)
# =============================================================
OBSERVE_APP_KEY=YOUR_APP_KEY
OBSERVE_APP_SECRET=YOUR_APP_SECRET
```

---

## 🚦 Getting Started

### 1. Install Dependencies
```bash
bun install
```

### 2. Verify Database Connection
Test your PostgreSQL or Supabase connectivity before starting the application:
```bash
bun run test:db
```

### 3. Run Development Server
```bash
bun run start:dev
```
On boot, the server initializes database tables, executes seeds, and is accessible at:
- **API Base**: `http://localhost:4040`
- **Swagger OpenAPI Documentation**: `http://localhost:4040/api/docs`
- **Scalar Interactive Documentation**: `http://localhost:4040/api/scalar`

### 4. Build for Production
```bash
bun run build
bun run start:prod
```

---

## 🧪 Testing & Quality Assurance

The codebase includes an extensive unit and integration test suite guaranteeing zero regressions across all core features:

```bash
# Run full unit test suite (70 tests across 8 suites)
bun test

# Run tests with code coverage report
bun run test:cov

# Run e2e tests
bun run test:e2e

# Run TypeScript type safety check (zero errors)
bun x tsc --noEmit

# Run Oxlint linter
bun run lint
```

### Verified Test Suites
1. **`OrdersService`** (`src/orders/orders.service.spec.ts`):
   - Unauthenticated guest checkout & 15-minute reservations.
   - Multi-vendor parent + store order distribution with snapshots.
   - Cross-tenant customer isolation (Customer A cannot access Customer B orders).
   - Store Admin fulfillment scoping & Parent Order status rollup.
   - Cancellation rules (allowed in PENDING, blocked once shipped).
2. **`CartService`** (`src/cart/cart.service.spec.ts`):
   - Multi-vendor store grouping and tax calculations.
   - Stock limits, unpublished product guards, and inactive store rejection.
   - Line item mutations (`updateItem`, `removeItem`, `clearCart`).
3. **`ReturnsService`** (`src/returns/returns.service.spec.ts`):
   - 14-day statutory consumer right of withdrawal validation.
   - Exemption enforcement for non-returnable products (`isReturnEligible: false`).
   - Durable-medium confirmation dispatch.
4. **`ReviewsService`** (`src/reviews/reviews.service.spec.ts`):
   - Verified purchaser strict gating (unverified buyers rejected).
   - Duplicate review prevention.
   - Rating averages and star distribution calculations.
5. **`CustomerAuthService`** (`src/customer-auth/customer-auth.service.spec.ts`):
   - Registration, 24-hour verification token validation, login gating for suspended accounts.
6. **`StoreAuthService`** (`src/store-auth/store-auth.service.spec.ts`):
   - Vendor application submission (`UNDER_REVIEW`).
   - Status-based login gating (`ACTIVE`/`APPROVED` allowed; `REJECTED`/`SUSPENDED` rejected).
7. **`StoresService`** (`src/stores/stores.service.spec.ts`):
   - Platform admin approval, rejection, activation, and suspension.
8. **`StoreContextGuard`** (`src/stores/guards/store-context.guard.spec.ts`):
   - Tenant isolation enforcement (Store Admin A blocked from Store B).

---

## 🔑 Default Credentials

On first run, the seeder creates the initial platform admin account:

| Field | Value |
|---|---|
| **Email** | `admin@platform.com` |
| **Password** | `Admin@123456` |
| **Role** | `SUPER_ADMIN` (All system permissions) |

---

## 📡 Complete API Reference

### 🔐 Platform Admin Authentication (`/admin/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/admin/auth/login` | Sign in with email & password | ❌ |
| `POST` | `/admin/auth/refresh` | Refresh access token using refresh token | ❌ |
| `POST` | `/admin/auth/logout` | Invalidate session and audit log sign-out | ✅ |
| `GET` | `/admin/auth/me` | Get admin profile, roles & permissions | ✅ |
| `POST` | `/admin/auth/change-password` | Update admin account password | ✅ |

### 👥 User Management (`/admin/users`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/users` | `users.read` | List users (paginated, search, status filter) |
| `POST` | `/admin/users` | `users.create` | Create a new user account |
| `GET` | `/admin/users/:id` | `users.read` | Get user by ID with roles and permissions |
| `PATCH` | `/admin/users/:id` | `users.update` | Update user details (name, email) |
| `DELETE` | `/admin/users/:id` | `users.delete` | Delete user (protected from last Super Admin) |
| `POST` | `/admin/users/:id/activate` | `users.update` | Activate user account |
| `POST` | `/admin/users/:id/deactivate`| `users.update` | Deactivate user account |
| `POST` | `/admin/users/:id/roles` | `users.update` | Assign role (`{ "roleId": "UUID" }`) |
| `DELETE` | `/admin/users/:id/roles/:roleId`| `users.update` | Remove role from user |

### 🛡️ Role Management (`/admin/roles`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/roles` | `roles.read` | List all platform roles |
| `POST` | `/admin/roles` | `roles.create` | Create a new platform role |
| `GET` | `/admin/roles/:id` | `roles.read` | Get single role details |
| `PATCH` | `/admin/roles/:id` | `roles.update` | Update role name or description |
| `DELETE` | `/admin/roles/:id` | `roles.delete` | Delete role (cannot delete `SUPER_ADMIN`) |
| `POST` | `/admin/roles/:id/permissions` | `roles.update` | Assign permission to role |
| `DELETE` | `/admin/roles/:id/permissions/:permissionId` | `roles.update` | Remove permission from role |

### 🔑 Permission Management (`/admin/permissions`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/permissions` | `permissions.read` | List all system permissions |
| `POST` | `/admin/permissions` | `permissions.create` | Create a new permission key |
| `GET` | `/admin/permissions/:id` | `permissions.read` | Get single permission detail |
| `PATCH` | `/admin/permissions/:id` | `permissions.update` | Update permission key/description |
| `DELETE` | `/admin/permissions/:id` | `permissions.delete` | Delete permission |

### 🏬 Store Application Lifecycle (`/admin/stores`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/stores` | `stores.read` | List store applications (paginated, status filter, search) |
| `GET` | `/admin/stores/:id` | `stores.read` | Get store details with assigned Store Admins |
| `POST` | `/admin/stores/:id/approve` | `stores.approve` | Approve application (`UNDER_REVIEW` → `APPROVED`) |
| `POST` | `/admin/stores/:id/reject` | `stores.reject` | Reject application with reason (`→ REJECTED`) |
| `POST` | `/admin/stores/:id/activate` | `stores.activate` | Activate approved or reactivate suspended store (`→ ACTIVE`) |
| `POST` | `/admin/stores/:id/suspend` | `stores.suspend` | Suspend active store with reason (`→ SUSPENDED`) |
| `POST` | `/admin/stores/:id/admins` | `stores.update` | Grant store admin access to a user |
| `DELETE` | `/admin/stores/:id/admins/:adminId` | `stores.update` | Revoke store admin access from a user |

### 📦 Product Approval & Moderation (`/admin/products`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/products` | `products.read` | View all products across all stores with filtering |
| `GET` | `/admin/products/:id` | `products.read` | Get product detail |
| `POST` | `/admin/products/:id/approve` | `products.approve` | Approve SUBMITTED product → APPROVED |
| `POST` | `/admin/products/:id/reject` | `products.approve` | Reject SUBMITTED product → REJECTED (with reason) |
| `POST` | `/admin/products/:id/publish` | `products.publish` | Publish APPROVED product → PUBLISHED |

### 📑 Parent & Store Order Management (`/admin/orders`, `/admin/store-orders`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/orders` | `orders.read` | List all parent orders across the marketplace |
| `GET` | `/admin/orders/:id` | `orders.read` | Get parent order detail with all store sub-orders |
| `PATCH` | `/admin/orders/:id/status` | `orders.update` | Update order status (e.g. `PAID` converts reservations) |
| `GET` | `/admin/store-orders` | `orders.read` | List all store fulfillment orders |
| `GET` | `/admin/store-orders/:id` | `orders.read` | View any individual store order |

### 🔄 Returns & Complaints Administration (`/admin/returns`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/returns` | `returns.read` | View marketplace-wide returns queue |
| `GET` | `/admin/returns/:id` | `returns.read` | View detailed return request and order snapshot |
| `PATCH` | `/admin/returns/:id/status` | `returns.update` | Approve, reject, or refund return request with resolution notes |

### ⭐ Review Moderation (`/admin/reviews`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/reviews` | `reviews.read` | List all reviews across the marketplace |
| `PATCH` | `/admin/reviews/:id/moderate` | `reviews.update` | Moderate review status (`PUBLISHED` / `REJECTED`) |
| `DELETE` | `/admin/reviews/:id` | `reviews.delete` | Hard-delete policy-violating review |

### 📜 Audit Logs (`/admin/audit-logs`)
| Method | Endpoint | Required Permission | Description |
|---|---|---|---|
| `GET` | `/admin/audit-logs` | `audit.read` | Query paginated audit log entries with filters |
| `GET` | `/admin/audit-logs/:id` | `audit.read` | Get single audit log entry |

### 🏪 Store Admin Authentication & Profile (`/store-auth`, `/store/profile`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/store-auth/signup` | Vendor signup & store application (`UNDER_REVIEW`) | ❌ |
| `POST` | `/store-auth/login` | Store Admin login (requires `ACTIVE` or `APPROVED` store) | ❌ |
| `GET` | `/store-auth/me` | Get Store Admin profile, store info & permissions | ✅ (Store Admin) |
| `GET` | `/store/profile` | Get store profile and current status | ✅ (Store Admin) |
| `PUT` | `/store/profile` | Update store public profile (name, logo, description) | ✅ (Store Admin) |
| `PUT` | `/store/profile/settings` | Update store settings (currency, timezone, low stock) | ✅ (Store Admin) |

### 📦 Store Product & Inventory Management (`/store/products`)
> Protected: **Store Admin** (JWT + `StoreContextGuard` — tenant-isolated to `storeId`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/store/products` | Create new product in `DRAFT` status |
| `GET` | `/store/products` | List own store products with filters |
| `GET` | `/store/products/:id` | Get own product detail |
| `PUT` | `/store/products/:id` | Update product details (`DRAFT` / `REJECTED` only) |
| `POST` | `/store/products/:id/submit` | Submit product for platform approval (`SUBMITTED`) |
| `POST` | `/store/products/:id/archive` | Archive product (removes from marketplace) |
| `DELETE` | `/store/products/:id` | Hard delete product (`DRAFT` / `ARCHIVED` only) |
| `POST` | `/store/products/:id/variants` | Add product variant (size, color, SKU, price, stock) |
| `PUT` | `/store/products/:id/variants/:variantId` | Update variant |
| `DELETE` | `/store/products/:id/variants/:variantId` | Delete variant |
| `POST` | `/store/products/:id/images` | Add product image |
| `DELETE` | `/store/products/:id/images/:imageId` | Delete product image |
| `GET` | `/store/products/inventory/summary` | Store-wide inventory overview |
| `GET` | `/store/products/:id/inventory` | Product inventory detail |
| `PUT` | `/store/products/:id/variants/:variantId/inventory` | Set absolute inventory stock |
| `POST` | `/store/products/:id/variants/:variantId/inventory/adjust` | Adjust inventory stock by delta (+/-) |

### 🚚 Store Order Fulfillment (`/store/orders`)
> Protected: **Store Admin** (JWT + `StoreContextGuard` — tenant-isolated to `storeId`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/store/orders` | List fulfillment orders belonging strictly to authenticated store |
| `GET` | `/store/orders/:id` | View store order details with shipping snapshot and line items |
| `PATCH` | `/store/orders/:id/status` | Update fulfillment status (`PENDING` → `PROCESSING` → `SHIPPED` → `DELIVERED`). Automatically rolls up Parent Order status! |

### 🔄 Store Returns Processing (`/store/returns`)
> Protected: **Store Admin** (JWT + `StoreContextGuard` — tenant-isolated to `storeId`)

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/store/returns` | List returns filed against products from authenticated store |
| `GET` | `/store/returns/:id` | View store return request details |

### 👤 Customer Account & Authentication (`/customer/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/customer/auth/register` | Register customer account (sends 24h verification token) | ❌ |
| `POST` | `/customer/auth/verify-email` | Verify customer email using token | ❌ |
| `POST` | `/customer/auth/resend-verification` | Resend verification email token | ❌ |
| `POST` | `/customer/auth/login` | Authenticate customer and issue JWT tokens | ❌ |
| `POST` | `/customer/auth/forgot-password` | Send password reset token to email (1h expiration) | ❌ |
| `POST` | `/customer/auth/reset-password` | Reset password using email verification token | ❌ |
| `GET` | `/customer/auth/me` | Fetch authenticated customer profile with saved addresses | ✅ (Customer) |
| `PATCH` | `/customer/auth/profile` | Update personal profile (name, phone) | ✅ (Customer) |

### 📍 Customer Address Book (`/customer/addresses`)
> Protected: **Authenticated Customer** (`access-token`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/customer/addresses` | Add a new delivery address |
| `GET` | `/customer/addresses` | List all saved addresses (primary default sorted first) |
| `GET` | `/customer/addresses/:id` | Get individual address detail |
| `PUT` | `/customer/addresses/:id` | Update saved address |
| `PATCH` | `/customer/addresses/:id/default` | Set address as primary default |
| `DELETE` | `/customer/addresses/:id` | Delete saved address |

### 🛒 Customer Cart (`/customer/cart`)
> Protected: **Authenticated Customer** (`access-token`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/customer/cart` | Get or initialize customer shopping cart |
| `GET` | `/customer/cart` | View cart grouped by store with live prices, taxes & stock validation |
| `POST` | `/customer/cart/items` | Add product variant to cart (validates PUBLISHED, ACTIVE, stock) |
| `PATCH` | `/customer/cart/items/:id` | Update line item quantity with real-time stock validation |
| `DELETE` | `/customer/cart/items/:id` | Remove line item from cart |
| `DELETE` | `/customer/cart` | Clear entire shopping cart |

### 💳 Customer Checkout & Orders (`/customer/checkout`, `/customer/orders`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/customer/checkout` | Multi-vendor atomic checkout: locks variants, creates 1 Parent + N Store orders, reserves inventory for 15 mins, clears cart | ✅ (Customer) |
| `POST` | `/customer/checkout/guest` | Unauthenticated guest checkout: creates orders, locks stock, reserves 15 mins, sends confirmation email | ❌ |
| `GET` | `/customer/orders` | View own order history with pagination and status filters | ✅ (Customer) |
| `GET` | `/customer/orders/:id` | View detailed order breakdown (own orders only) | ✅ (Customer) |
| `POST` | `/customer/orders/:id/cancel` | Cancel order in PENDING status (releases 15-min reservations; blocked once shipped) | ✅ (Customer) |
| `GET` | `/customer/orders/guest/track` | Track guest order status by `orderNumber` & `guestEmail` | ❌ |

### 🔄 Customer Returns & Statutory Withdrawal (`/customer/returns`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `POST` | `/customer/returns` | Submit 14-day consumer withdrawal or defect complaint (registered or guest) | ❌ |
| `GET` | `/customer/returns` | List own submitted return requests | ✅ (Customer) |
| `GET` | `/customer/returns/:id` | View return request status and resolution notes | ✅ (Customer) |

### ⭐ Customer Verified Reviews (`/customer/reviews`)
> Protected: **Authenticated Customer** (`access-token`)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/customer/reviews` | Submit verified purchase review (1-5 stars + comment; gated by confirmed order) |
| `GET` | `/customer/reviews/my` | View own submitted product reviews |
| `PATCH` | `/customer/reviews/:id` | Update own review |
| `DELETE` | `/customer/reviews/:id` | Delete own review |

### 🌐 Public Marketplace Catalog & Health (`/marketplace`, `/categories`, `/database`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|:---:|
| `GET` | `/marketplace` | Global catalog: PUBLISHED products from ACTIVE stores with filters (`?search=`, `?categoryId=`, `?storeId=`, `?minPrice=`, `?maxPrice=`, `?inStockOnly=true`) | ❌ |
| `GET` | `/marketplace/:id` | Single product public details | ❌ |
| `GET` | `/marketplace/products/:productId/reviews` | View published reviews, average rating (1-5★) & star breakdown | ❌ |
| `GET` | `/categories/tree` | Full nested 2-level category tree | ❌ |
| `GET` | `/categories` | Flat category list with optional `?status=` filter | ❌ |
| `GET` | `/categories/:id` | Single category detail | ❌ |
| `GET` | `/database/status` | Real-time database connection test & version report | ❌ |

---

## 🔒 Security & Tenant Isolation Rules

| Dimension | Rule & Behavior |
|---|---|
| **Multi-Store Isolation** | Store Admin tokens bind to a specific `storeId`. Queries and mutations strictly scope to that store. Cross-store access attempts return `404 Not Found`. |
| **Customer Order Isolation** | Customer endpoints query with `where: { id: orderId, customerId }`. Accessing another customer's order returns `404 Not Found`. |
| **Platform Admin Omnipresence** | Platform administrators with appropriate permissions (`orders.read`, `stores.read`, `products.read`) maintain global visibility across all tenants. |
| **Password Security** | Hashed using `bcrypt` (10 salt rounds). Excluded by default from database queries (`select: false`). |
| **Pessimistic Inventory Locking** | Checkout uses PostgreSQL `pessimistic_write` row locks on `ProductVariant` inside transactions to prevent overselling. |
| **Durable-Medium Records** | Returns and order confirmations generate persistent identifiers with timestamped receipt notices. |
| **Fail-Safe Super Admin Rule** | The last remaining active `SUPER_ADMIN` cannot be deleted, deactivated, or stripped of their role. |
| **Input Validation** | NestJS `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true`, and `transform: true`. |
| **Rate Limiting** | Throttler protection against brute force authentication and scraping attacks. |

---

## 📄 License

This project is licensed under the UNLICENSED private commercial license.
