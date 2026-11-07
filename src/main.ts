import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule, ObserveInstrument } from './app.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { PermissionsGuard } from './common/guards/permissions.guard.js';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    instrument: ObserveInstrument,
  });

  // ── CORS ─────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: process.env['CORS_ORIGIN'] ?? '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'x-store-id',
      'X-Store-Id',
      'x-correlation-id',
      'Accept',
    ],
  });

  // ── Global ValidationPipe ─────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,           // strip unknown fields
      forbidNonWhitelisted: true,
      transform: true,           // auto-transform query params to typed values
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ── Global Exception Filter ───────────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Global Guards (JWT + Permissions) ─────────────────────────────────────
  const reflector = app.get(Reflector);
  app.useGlobalGuards(
    new JwtAuthGuard(reflector),
    new PermissionsGuard(reflector),
  );

  // ── Swagger Setup ─────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Multi-Tenant Marketplace API')
    .setDescription(
      'Enterprise Multi-Tenant Marketplace API documentation organized into 4 distinct role-based domains:\n\n' +
      '• **1. Platform Admin**: Marketplace oversight, user/role management, store approvals, product moderation & audit logs.\n' +
      '• **2. Seller / Store Admin**: Vendor onboarding, store profile, product & inventory management, and order fulfillment.\n' +
      '• **3. Customer**: Identity, email verification, saved address book, multi-vendor cart, checkout, orders, returns & reviews.\n' +
      '• **4. Marketplace & Public**: Public catalog browsing, categories tree, ratings breakdown, and system health checks.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    // 1. Platform Admin Tags
    .addTag('1. Platform Admin — Authentication', 'Platform admin login, refresh, logout, profile & password change')
    .addTag('1. Platform Admin — Users', 'User account administration, activation, deactivation & role assignments')
    .addTag('1. Platform Admin — Roles', 'System role management & granular permission assignments')
    .addTag('1. Platform Admin — Permissions', 'Granular platform permission definitions')
    .addTag('1. Platform Admin — Store Management', 'Vendor application review, approval, rejection, activation & suspension')
    .addTag('1. Platform Admin — Product Moderation', 'Review, approve, reject & publish vendor products')
    .addTag('1. Platform Admin — Orders & Fulfillment', 'Marketplace-wide parent orders and store orders visibility & status management')
    .addTag('1. Platform Admin — Returns & Disputes', 'Marketplace-wide returns queue & refund resolution')
    .addTag('1. Platform Admin — Review Moderation', 'Moderate, publish & remove customer product reviews')
    .addTag('1. Platform Admin — Audit Logs', 'Immutable audit trail of administrative and store actions')
    .addTag('1. Platform Admin — Invoices & Accounting', 'Platform-wide invoices, billing, and tax audit records')
    .addTag('1. Platform Admin — Payouts & Settlement', 'Marketplace-wide vendor settlement, 10% fee oversight & disbursement engine')
    // 2. Seller / Store Admin Tags
    .addTag('2. Seller / Store — Authentication & Onboarding', 'Vendor registration application, login & session profile')
    .addTag('2. Seller / Store — Profile & Settings', 'Store public profile (name, logo, description) & operating settings')
    .addTag('2. Seller / Store — Products & Inventory', 'Store product lifecycle (DRAFT, submit, archive), variants & stock control')
    .addTag('2. Seller / Store — Order Fulfillment', 'Store-specific fulfillment orders & shipment status updates')
    .addTag('2. Seller / Store — Returns Processing', 'Returns and complaints filed against authenticated store products')
    .addTag('2. Seller / Store — Sales & Financials', 'Store gross sales, 10% platform cuts, 90% net earnings, and 14-day hold clearance')
    .addTag('2. Seller / Store — Payouts & Settlements', 'Payout disbursements, bank account settings, and payout history')
    .addTag('2. Seller / Store — Invoices & Receipts', 'Store sales invoices and receipts for accounting')
    // 3. Customer Tags
    .addTag('3. Customer — Identity & Account', 'Customer registration, email verification (24h token), login & profile')
    .addTag('3. Customer — Address Book', 'Saved shipping address book with primary default selection')
    .addTag('3. Customer — Shopping Cart', 'Multi-vendor shopping cart (add, update, remove, group totals)')
    .addTag('3. Customer — Orders & Checkout', 'Multi-vendor atomic checkout, guest checkout, tracking & cancellation')
    .addTag('3. Customer — Payments (Stripe)', 'Stripe PaymentIntent checkout, clientSecret creation & webhook listener')
    .addTag('3. Customer — Invoices & Receipts', 'Tax invoice retrieval and printable HTML download')
    .addTag('3. Customer — Returns & 14-Day Withdrawal', '14-day statutory consumer withdrawal & defect complaints')
    .addTag('3. Customer — Product Reviews', 'Verified purchaser 1-5 star ratings & reviews submission')
    // 4. Marketplace & Public Tags
    .addTag('4. Marketplace & Public — Products Catalog', 'Public catalog search & filters across active published products')
    .addTag('4. Marketplace & Public — Categories Tree', 'Platform-wide 2-level category tree & category inspection')
    .addTag('4. Marketplace & Public — Product Reviews & Ratings', 'Public verified buyer rating averages & star distributions')
    .addTag('4. Marketplace & Public — System & Database Health', 'Real-time database connection test & version ping')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Group tags natively for Scalar and OpenAPI modern documentation renderers
  (document as any)['x-tagGroups'] = [
    {
      name: '👑 1. Platform Admin',
      tags: [
        '1. Platform Admin — Authentication',
        '1. Platform Admin — Users',
        '1. Platform Admin — Roles',
        '1. Platform Admin — Permissions',
        '1. Platform Admin — Store Management',
        '1. Platform Admin — Product Moderation',
        '1. Platform Admin — Orders & Fulfillment',
        '1. Platform Admin — Returns & Disputes',
        '1. Platform Admin — Review Moderation',
        '1. Platform Admin — Audit Logs',
        '1. Platform Admin — Invoices & Accounting',
        '1. Platform Admin — Payouts & Settlement',
      ],
    },
    {
      name: '🏪 2. Seller / Store Admin',
      tags: [
        '2. Seller / Store — Authentication & Onboarding',
        '2. Seller / Store — Profile & Settings',
        '2. Seller / Store — Products & Inventory',
        '2. Seller / Store — Order Fulfillment',
        '2. Seller / Store — Returns Processing',
        '2. Seller / Store — Sales & Financials',
        '2. Seller / Store — Payouts & Settlements',
        '2. Seller / Store — Invoices & Receipts',
      ],
    },
    {
      name: '👤 3. Customer',
      tags: [
        '3. Customer — Identity & Account',
        '3. Customer — Address Book',
        '3. Customer — Shopping Cart',
        '3. Customer — Orders & Checkout',
        '3. Customer — Payments (Stripe)',
        '3. Customer — Invoices & Receipts',
        '3. Customer — Returns & 14-Day Withdrawal',
        '3. Customer — Product Reviews',
      ],
    },
    {
      name: '🌐 4. Marketplace & Public',
      tags: [
        '4. Marketplace & Public — Products Catalog',
        '4. Marketplace & Public — Categories Tree',
        '4. Marketplace & Public — Product Reviews & Ratings',
        '4. Marketplace & Public — System & Database Health',
      ],
    },
  ];

  // Swagger UI at /api/docs
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  // ── Scalar UI at /api/scalar ──────────────────────────────────────────────
  const { apiReference } = await import('@scalar/nestjs-api-reference');
  app.use(
    '/api/scalar',
    apiReference({
      spec: { content: document },
      theme: 'purple',
    }),
  );

  const port = process.env['PORT'] ?? 4040;
  await app.listen(port);

  console.log(`\n🚀 Server running on http://localhost:${port}`);
  console.log(`📖 Swagger UI  → http://localhost:${port}/api/docs`);
  console.log(`🎯 Scalar UI   → http://localhost:${port}/api/scalar\n`);
}

await bootstrap();
