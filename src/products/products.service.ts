import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';

import { Product } from './entities/product.entity.js';
import { ProductVariant } from './entities/product-variant.entity.js';
import { ProductImage } from './entities/product-image.entity.js';
import { ProductStatus } from './enums/product-status.enum.js';
import { Category } from '../categories/entities/category.entity.js';
import { Store } from '../stores/entities/store.entity.js';
import { StoreStatus } from '../stores/enums/store-status.enum.js';
import { ProductReview } from '../reviews/entities/product-review.entity.js';
import { ReviewStatus } from '../reviews/enums/review-status.enum.js';

import { CreateProductDto } from './dto/create-product.dto.js';
import { UpdateProductDto } from './dto/update-product.dto.js';
import { ProductQueryDto, MarketplaceQueryDto } from './dto/product-query.dto.js';
import { UpdateVariantInventoryDto, AdjustVariantInventoryDto } from './dto/update-inventory.dto.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    @InjectRepository(ProductImage) private imageRepo: Repository<ProductImage>,
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Store) private storeRepo: Repository<Store>,
    @InjectRepository(ProductReview) private reviewRepo: Repository<ProductReview>,
    private dataSource: DataSource,
    private auditService: AuditService,
  ) {}

  // ── Store Admin: Product CRUD ──────────────────────────────────────────

  /**
   * Store Admin: Create a new product (starts as DRAFT)
   */
  async create(storeId: string, dto: CreateProductDto, actorId?: string): Promise<Product> {
    await this.assertStoreActive(storeId);

    if (dto.categoryId) {
      await this.assertCategoryExists(dto.categoryId);
    }

    const slug = await this.generateUniqueSlug(dto.name);

    const product = await this.dataSource.transaction(async (em) => {
      const p = em.create(Product, {
        storeId,
        categoryId: dto.categoryId ?? null,
        name: dto.name,
        slug,
        description: dto.description ?? null,
        sku: dto.sku ?? null,
        price: dto.price,
        vatRate: dto.vatRate ?? 0,
        vatIncluded: dto.vatIncluded ?? false,
        vatCode: dto.vatCode ?? null,
        trackInventory: dto.trackInventory ?? true,
        status: ProductStatus.DRAFT,
      });
      const saved = await em.save(Product, p);

      // Create variants
      if (dto.variants?.length) {
        for (const vDto of dto.variants) {
          if (vDto.sku) {
            await this.assertVariantSkuUnique(vDto.sku, em);
          }
          const variant = em.create(ProductVariant, {
            productId: saved.id,
            size: vDto.size ?? null,
            color: vDto.color ?? null,
            model: vDto.model ?? null,
            attributeKey: vDto.attributeKey ?? null,
            attributeValue: vDto.attributeValue ?? null,
            sku: vDto.sku ?? null,
            price: vDto.price ?? null,
            stockQuantity: vDto.stockQuantity ?? 0,
            lowStockThreshold: vDto.lowStockThreshold ?? 5,
          });
          await em.save(ProductVariant, variant);
        }
      }

      // Create images
      if (dto.images?.length) {
        // Ensure only one primary
        let primarySet = false;
        for (const imgDto of dto.images) {
          const isPrimary = imgDto.isPrimary && !primarySet;
          if (isPrimary) primarySet = true;
          const img = em.create(ProductImage, {
            productId: saved.id,
            url: imgDto.url,
            altText: imgDto.altText ?? null,
            sortOrder: imgDto.sortOrder ?? 0,
            isPrimary,
          });
          await em.save(ProductImage, img);
        }
      }

      return saved;
    });

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_CREATED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, storeId },
    });

    return this.findOne(product.id, storeId);
  }

  /**
   * Store Admin: List own store's products with filtering
   */
  async findAll(storeId: string, query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('p.images', 'img')
      .where('p.storeId = :storeId', { storeId })
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    if (query.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.search) {
      qb.andWhere(
        '(p.name ILIKE :s OR p.description ILIKE :s OR p.sku ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Find a single product (store-scoped or admin-scoped)
   */
  async findOne(id: string, storeId?: string): Promise<Product> {
    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('p.images', 'img')
      .leftJoinAndSelect('p.store', 's')
      .where('p.id = :id', { id });

    if (storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId });
    }

    const product = await qb.getOne();
    if (!product) {
      throw new NotFoundException(`Product "${id}" not found`);
    }
    return product;
  }

  /**
   * Store Admin: Update a product (only allowed if DRAFT or REJECTED)
   */
  async update(id: string, storeId?: string, dto?: UpdateProductDto, actorId?: string): Promise<Product> {
    const product = await this.findOne(id, storeId);

    if (product.status === ProductStatus.ARCHIVED) {
      throw new BadRequestException(
        `Cannot edit product in ARCHIVED status. Please unarchive it first.`,
      );
    }

    const isPublished = product.status === ProductStatus.PUBLISHED;

    if (dto?.categoryId !== undefined && dto.categoryId !== product.categoryId) {
      if (isPublished) {
        throw new BadRequestException('Cannot change the category of an already published product.');
      }
      if (dto.categoryId) {
        await this.assertCategoryExists(dto.categoryId);
      }
      product.categoryId = dto.categoryId ?? null;
    }

    if (dto?.sku !== undefined && dto.sku !== product.sku) {
      if (isPublished) {
        throw new BadRequestException('Cannot change the SKU of an already published product.');
      }
      product.sku = dto.sku ?? null;
    }

    if (dto?.name && dto.name !== product.name) {
      product.slug = await this.generateUniqueSlug(dto.name, id);
      product.name = dto.name;
    }

    if (dto?.description !== undefined) product.description = dto.description ?? null;
    if (dto?.price !== undefined) product.price = dto.price;
    if (dto?.vatRate !== undefined) product.vatRate = dto.vatRate;
    if (dto?.vatIncluded !== undefined) product.vatIncluded = dto.vatIncluded;
    if (dto?.vatCode !== undefined) product.vatCode = dto.vatCode ?? null;
    if (dto?.trackInventory !== undefined) product.trackInventory = dto.trackInventory;

    const updated = await this.productRepo.save(product);

    // Update or sync variants & stock inventory
    if (dto?.variants && Array.isArray(dto.variants) && dto.variants.length > 0) {
      const existingVariants = await this.variantRepo.find({ where: { productId: product.id } });
      if (dto.variants.length > 0) {
        // Multi-variant update: replace/sync all variants
        await this.variantRepo.delete({ productId: product.id });
        for (const vDto of dto.variants) {
          const v = this.variantRepo.create({
            productId: product.id,
            sku: vDto.sku ?? null,
            price: vDto.price ?? product.price,
            stockQuantity: vDto.stockQuantity ?? 0,
            lowStockThreshold: vDto.lowStockThreshold ?? 5,
            size: vDto.size ?? null,
            color: vDto.color ?? null,
            model: vDto.model ?? null,
            attributeKey: vDto.attributeKey ?? null,
            attributeValue: vDto.attributeValue ?? null,
            isActive: true,
          });
          await this.variantRepo.save(v);
        }
      }
    }

    // Update images if provided
    if (dto?.images && Array.isArray(dto.images) && dto.images.length > 0) {
      await this.imageRepo.delete({ productId: product.id });
      let primarySet = false;
      for (const imgDto of dto.images) {
        const isPrimary = imgDto.isPrimary && !primarySet;
        if (isPrimary) primarySet = true;
        const img = this.imageRepo.create({
          productId: product.id,
          url: imgDto.url,
          altText: imgDto.altText ?? null,
          sortOrder: imgDto.sortOrder ?? 0,
          isPrimary,
        });
        await this.imageRepo.save(img);
      }
    }

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_UPDATED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, storeId: product.storeId, status: product.status },
    });

    return this.findOne(updated.id, storeId);
  }

  /**
   * Store Admin: Archive a product (soft-delete equivalent)
   */
  async archive(id: string, storeId?: string, actorId?: string): Promise<Product> {
    const product = await this.findOne(id, storeId);
    product.status = ProductStatus.ARCHIVED;
    const updated = await this.productRepo.save(product);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_ARCHIVED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, storeId: product.storeId },
    });

    return updated;
  }

  /**
   * Store Admin: Hard-delete a product (only DRAFT or ARCHIVED)
   */
  async remove(id: string, storeId?: string, actorId?: string): Promise<{ message: string }> {
    const product = await this.findOne(id, storeId);

    if (![ProductStatus.DRAFT, ProductStatus.ARCHIVED].includes(product.status)) {
      throw new BadRequestException(
        `Cannot delete product in status "${product.status}". Archive it first.`,
      );
    }

    const name = product.name;
    await this.productRepo.remove(product);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_DELETED,
      resource: 'products',
      resourceId: id,
      metadata: { productName: name, storeId: product.storeId },
    });

    return { message: `Product "${name}" deleted successfully` };
  }

  // ── Approval Workflow ─────────────────────────────────────────────────

  /**
   * Store Admin: Submit product for platform admin approval
   */
  async submit(id: string, storeId?: string, actorId?: string): Promise<Product> {
    const product = await this.findOne(id, storeId);

    if (![ProductStatus.DRAFT, ProductStatus.REJECTED].includes(product.status)) {
      throw new BadRequestException(
        `Product must be in DRAFT or REJECTED status to submit. Current: "${product.status}"`,
      );
    }

    product.status = ProductStatus.SUBMITTED;
    product.rejectionReason = null;
    const updated = await this.productRepo.save(product);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_SUBMITTED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, storeId: product.storeId },
    });

    return updated;
  }


  /**
   * Platform Admin: Approve a product
   */
  async approve(id: string, actorId?: string): Promise<Product> {
    const product = await this.findOne(id);

    if (product.status !== ProductStatus.SUBMITTED) {
      throw new BadRequestException(
        `Product must be SUBMITTED to be approved. Current: "${product.status}"`,
      );
    }

    product.status = ProductStatus.APPROVED;
    product.rejectionReason = null;
    const updated = await this.productRepo.save(product);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_APPROVED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, storeId: product.storeId },
    });

    return updated;
  }

  /**
   * Platform Admin: Reject a product with reason
   */
  async reject(id: string, reason: string, actorId?: string): Promise<Product> {
    const product = await this.findOne(id);

    if (product.status !== ProductStatus.SUBMITTED) {
      throw new BadRequestException(
        `Product must be SUBMITTED to be rejected. Current: "${product.status}"`,
      );
    }

    product.status = ProductStatus.REJECTED;
    product.rejectionReason = reason;
    const updated = await this.productRepo.save(product);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_REJECTED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, reason, storeId: product.storeId },
    });

    return updated;
  }

  /**
   * Platform Admin: Publish an approved product to the marketplace
   */
  async publish(id: string, actorId?: string, storeId?: string): Promise<Product> {
    const product = await this.findOne(id, storeId);

    if (product.status !== ProductStatus.APPROVED) {
      throw new BadRequestException(
        `Product must be APPROVED before publishing. Current: "${product.status}"`,
      );
    }

    product.status = ProductStatus.PUBLISHED;
    const updated = await this.productRepo.save(product);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.PRODUCT_PUBLISHED,
      resource: 'products',
      resourceId: product.id,
      metadata: { productName: product.name, storeId: product.storeId },
    });

    return updated;
  }

  // ── Platform Admin: All Products ─────────────────────────────────────

  /**
   * Platform Admin: List all products across all stores
   */
  async findAllAdmin(query: ProductQueryDto): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.store', 's')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('p.images', 'img')
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) {
      qb.andWhere('p.status = :status', { status: query.status });
    }
    if (query.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.search) {
      qb.andWhere(
        '(p.name ILIKE :s OR p.description ILIKE :s OR p.sku ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  // ── Variants ──────────────────────────────────────────────────────────

  async addVariant(productId: string, storeId: string | undefined, dto: import('./dto/create-product.dto.js').CreateProductVariantDto): Promise<ProductVariant> {
    const product = await this.findOne(productId, storeId);

    if (dto.sku) {
      const existing = await this.variantRepo.findOne({ where: { sku: dto.sku } });
      if (existing && existing.productId !== productId) {
        throw new ConflictException(`Variant SKU "${dto.sku}" is already in use`);
      }
    }

    const variant = this.variantRepo.create({
      productId: product.id,
      size: dto.size ?? null,
      color: dto.color ?? null,
      model: dto.model ?? null,
      attributeKey: dto.attributeKey ?? null,
      attributeValue: dto.attributeValue ?? null,
      sku: dto.sku ?? null,
      price: dto.price ?? null,
      stockQuantity: dto.stockQuantity ?? 0,
      lowStockThreshold: dto.lowStockThreshold ?? 5,
    });

    return this.variantRepo.save(variant);
  }

  async updateVariant(
    variantId: string,
    productId: string,
    storeId: string | undefined,
    dto: Partial<import('./dto/create-product.dto.js').CreateProductVariantDto>,
  ): Promise<ProductVariant> {
    const variant = await this.findVariant(variantId, productId, storeId);

    if (dto.sku && dto.sku !== variant.sku) {
      const existing = await this.variantRepo.findOne({ where: { sku: dto.sku } });
      if (existing) throw new ConflictException(`Variant SKU "${dto.sku}" is already in use`);
    }

    Object.assign(variant, {
      size: dto.size !== undefined ? (dto.size ?? null) : variant.size,
      color: dto.color !== undefined ? (dto.color ?? null) : variant.color,
      model: dto.model !== undefined ? (dto.model ?? null) : variant.model,
      attributeKey: dto.attributeKey !== undefined ? (dto.attributeKey ?? null) : variant.attributeKey,
      attributeValue: dto.attributeValue !== undefined ? (dto.attributeValue ?? null) : variant.attributeValue,
      sku: dto.sku !== undefined ? (dto.sku ?? null) : variant.sku,
      price: dto.price !== undefined ? (dto.price ?? null) : variant.price,
      stockQuantity: dto.stockQuantity !== undefined ? dto.stockQuantity : variant.stockQuantity,
      lowStockThreshold: dto.lowStockThreshold !== undefined ? dto.lowStockThreshold : variant.lowStockThreshold,
    });

    return this.variantRepo.save(variant);
  }

  async removeVariant(variantId: string, productId: string, storeId?: string): Promise<{ message: string }> {
    const variant = await this.findVariant(variantId, productId, storeId);
    await this.variantRepo.remove(variant);
    return { message: 'Variant deleted successfully' };
  }

  // ── Images ────────────────────────────────────────────────────────────

  async addImage(productId: string, storeId: string | undefined, dto: import('./dto/create-product.dto.js').CreateProductImageDto): Promise<ProductImage> {
    const product = await this.findOne(productId, storeId);

    // If marking as primary, unset others
    if (dto.isPrimary) {
      await this.imageRepo
        .createQueryBuilder()
        .update(ProductImage)
        .set({ isPrimary: false })
        .where('productId = :productId', { productId: product.id })
        .execute();
    }

    const image = this.imageRepo.create({
      productId: product.id,
      url: dto.url,
      altText: dto.altText ?? null,
      sortOrder: dto.sortOrder ?? 0,
      isPrimary: dto.isPrimary ?? false,
    });

    return this.imageRepo.save(image);
  }

  async removeImage(imageId: string, productId: string, storeId?: string): Promise<{ message: string }> {
    await this.findOne(productId, storeId); // ownership check
    const image = await this.imageRepo.findOne({ where: { id: imageId, productId } });
    if (!image) throw new NotFoundException(`Image "${imageId}" not found`);
    await this.imageRepo.remove(image);
    return { message: 'Image deleted successfully' };
  }

  // ── Inventory ─────────────────────────────────────────────────────────

  /**
   * Get inventory summary for a store's product
   */
  /**
   * Get inventory summary for a store's product
   */
  async getInventory(productId: string, storeId?: string): Promise<{
    product: { id: string; name: string };
    variants: Array<{
      id: string;
      sku: string | null;
      size: string | null;
      color: string | null;
      model: string | null;
      stockQuantity: number;
      lowStockThreshold: number;
      status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    }>;
  }> {
    const product = await this.findOne(productId, storeId);

    const variants = product.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size,
      color: v.color,
      model: v.model,
      stockQuantity: v.stockQuantity,
      lowStockThreshold: v.lowStockThreshold,
      status: this.resolveStockStatus(v),
    }));

    return {
      product: { id: product.id, name: product.name },
      variants,
    };
  }

  /**
   * Store Admin: List all inventory across store with low/out-of-stock flags
   */
  async getStoreInventory(storeId: string): Promise<{
    total: number;
    outOfStock: number;
    lowStock: number;
    variants: Array<{
      variantId: string;
      productId: string;
      productName: string;
      sku: string | null;
      stockQuantity: number;
      lowStockThreshold: number;
      stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
    }>;
  }> {
    const variants = await this.variantRepo
      .createQueryBuilder('v')
      .innerJoinAndSelect('v.product', 'p')
      .where('p.storeId = :storeId', { storeId })
      .andWhere('p.trackInventory = true')
      .andWhere('p.status != :archived', { archived: ProductStatus.ARCHIVED })
      .orderBy('v.stockQuantity', 'ASC')
      .getMany();

    const mapped = variants.map((v) => ({
      variantId: v.id,
      productId: v.productId,
      productName: (v.product as Product)?.name ?? '',
      sku: v.sku,
      stockQuantity: v.stockQuantity,
      lowStockThreshold: v.lowStockThreshold,
      stockStatus: this.resolveStockStatus(v),
    }));

    return {
      total: mapped.length,
      outOfStock: mapped.filter((v) => v.stockStatus === 'OUT_OF_STOCK').length,
      lowStock: mapped.filter((v) => v.stockStatus === 'LOW_STOCK').length,
      variants: mapped,
    };
  }

  /**
   * Store Admin: Set absolute stock for a variant
   */
  async setVariantInventory(
    variantId: string,
    productId: string,
    storeId?: string,
    dto?: UpdateVariantInventoryDto,
    actorId?: string,
  ): Promise<ProductVariant> {
    const variant = await this.findVariant(variantId, productId, storeId);
    const prev = variant.stockQuantity;

    if (dto?.stockQuantity !== undefined) {
      variant.stockQuantity = dto.stockQuantity;
    }
    if (dto?.lowStockThreshold !== undefined) {
      variant.lowStockThreshold = dto.lowStockThreshold;
    }
    const updated = await this.variantRepo.save(variant);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.INVENTORY_UPDATED,
      resource: 'product_variants',
      resourceId: variantId,
      metadata: { productId, storeId, prevQty: prev, newQty: dto?.stockQuantity },
    });

    return updated;
  }

  /**
   * Store Admin: Adjust stock by delta (positive = add, negative = remove)
   */
  async adjustVariantInventory(
    variantId: string,
    productId: string,
    storeId?: string,
    dto?: AdjustVariantInventoryDto,
    actorId?: string,
  ): Promise<ProductVariant> {
    const variant = await this.findVariant(variantId, productId, storeId);
    const prev = variant.stockQuantity;
    const delta = dto?.delta ?? 0;
    const newQty = prev + delta;

    if (newQty < 0) {
      throw new BadRequestException(
        `Adjustment of ${delta} would result in negative stock (current: ${prev})`,
      );
    }

    variant.stockQuantity = newQty;
    const updated = await this.variantRepo.save(variant);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.INVENTORY_ADJUSTED,
      resource: 'product_variants',
      resourceId: variantId,
      metadata: { productId, storeId, prevQty: prev, delta, newQty, reason: dto?.adjustment },
    });

    return updated;
  }

  // ── Public Marketplace ────────────────────────────────────────────────

  /**
   * Public: Global marketplace catalog — only PUBLISHED products from ACTIVE stores
   */
  async getMarketplace(query: MarketplaceQueryDto): Promise<PaginatedResult<Product>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.productRepo
      .createQueryBuilder('p')
      .innerJoinAndSelect('p.store', 's', "s.status = 'ACTIVE'")
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .leftJoinAndSelect('p.variants', 'v', 'v.isActive = true')
      .where('p.status = :status', { status: ProductStatus.PUBLISHED })
      .orderBy('p.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.search) {
      qb.andWhere(
        '(p.name ILIKE :s OR p.description ILIKE :s)',
        { s: `%${query.search}%` },
      );
    }
    if (query.categoryId) {
      qb.andWhere('p.categoryId = :categoryId', { categoryId: query.categoryId });
    }
    if (query.storeId) {
      qb.andWhere('p.storeId = :storeId', { storeId: query.storeId });
    }
    if (query.minPrice !== undefined) {
      qb.andWhere('p.price >= :minPrice', { minPrice: query.minPrice });
    }
    if (query.maxPrice !== undefined) {
      qb.andWhere('p.price <= :maxPrice', { maxPrice: query.maxPrice });
    }
    if (query.inStockOnly) {
      // product must have at least one variant with stock > 0
      qb.andWhere(
        'EXISTS (SELECT 1 FROM product_variants pv WHERE pv."productId" = p.id AND pv."stockQuantity" > 0)',
      );
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  /**
   * Public Marketplace: List active stores with product count & preview gallery
   */
  async getMarketplaceStores(limit = 20, search?: string) {
    const qb = this.storeRepo
      .createQueryBuilder('s')
      .where("s.status = 'ACTIVE'")
      .orderBy('s.createdAt', 'DESC')
      .take(limit);

    if (search) {
      qb.andWhere('(s.name ILIKE :search OR s.description ILIKE :search OR s.address ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const stores = await qb.getMany();

    const result = await Promise.all(
      stores.map(async (store) => {
        const [products, productCount] = await this.productRepo
          .createQueryBuilder('p')
          .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
          .where('p.storeId = :storeId', { storeId: store.id })
          .andWhere('p.status = :status', { status: ProductStatus.PUBLISHED })
          .orderBy('p.createdAt', 'DESC')
          .take(3)
          .getManyAndCount();

        return {
          id: store.id,
          name: store.name,
          legalBusinessName: store.legalBusinessName,
          address: store.address,
          phone: store.phone,
          contactName: store.contactName,
          status: store.status,
          description: store.description,
          logoUrl: store.logoUrl,
          bannerUrl: store.bannerUrl,
          websiteUrl: store.websiteUrl,
          createdAt: store.createdAt,
          productCount,
          featuredProducts: products.map((prod) => {
            const primary = prod.images?.[0];
            return {
              id: prod.id,
              name: prod.name,
              slug: prod.slug,
              price: Number(prod.price),
              imageUrl: primary?.url || null,
            };
          }),
        };
      }),
    );

    return result;
  }

  /**
   * Public Marketplace: Get a single active store profile by ID or slug
   */
  async getMarketplaceStore(idOrSlug: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(idOrSlug);
    const qb = this.storeRepo.createQueryBuilder('s').where("s.status = 'ACTIVE'");

    if (isUuid) {
      qb.andWhere('s.id = :id', { id: idOrSlug });
    } else {
      qb.andWhere('(LOWER(s.name) = LOWER(:name) OR LOWER(REPLACE(s.name, \' \', \'-\')) = LOWER(:name))', {
        name: idOrSlug.replace(/-/g, ' '),
      });
    }

    const store = await qb.getOne();
    if (!store) {
      throw new NotFoundException(`Active store "${idOrSlug}" not found`);
    }

    const [products, productCount] = await this.productRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .where('p.storeId = :storeId', { storeId: store.id })
      .andWhere('p.status = :status', { status: ProductStatus.PUBLISHED })
      .orderBy('p.createdAt', 'DESC')
      .take(6)
      .getManyAndCount();

    return {
      ...store,
      productCount,
      featuredProducts: products.map((prod) => ({
        id: prod.id,
        name: prod.name,
        slug: prod.slug,
        price: Number(prod.price),
        imageUrl: prod.images?.[0]?.url || null,
      })),
    };
  }

  /**
   * Public Marketplace: Get recent published verified customer reviews
   */
  async getMarketplaceReviews(limit = 6) {
    const reviews = await this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'p')
      .leftJoinAndSelect('p.images', 'img', 'img.isPrimary = true')
      .leftJoinAndSelect('p.store', 's')
      .leftJoinAndSelect('r.user', 'u')
      .where('r.status = :status', { status: ReviewStatus.PUBLISHED })
      .orderBy('r.createdAt', 'DESC')
      .take(limit)
      .getMany();

    return reviews.map((r) => {
      const authorName = r.user?.name || 'Verified Buyer';
      const primaryImg = r.product?.images?.[0]?.url || null;

      return {
        id: r.id,
        author: authorName,
        city: 'Finland',
        rating: r.rating,
        comment: r.comment,
        title: r.title,
        isVerifiedPurchase: r.isVerifiedPurchase,
        createdAt: r.createdAt,
        productId: r.productId,
        productName: r.product?.name || 'Handcrafted Item',
        productPrice: r.product ? Number(r.product.price) : 0,
        productSlug: r.product?.slug || r.productId,
        productImageUrl: primaryImg,
        storeName: r.product?.store?.name || 'Nordic Studio',
      };
    });
  }

  /**
   * Public Marketplace: Newsletter subscription endpoint
   */
  async subscribeNewsletter(email: string) {
    if (!email || !email.includes('@')) {
      throw new BadRequestException('A valid email address is required');
    }
    return {
      success: true,
      message: 'Kiitos! You have been successfully subscribed to Nordic Marketplace dispatches.',
      email,
      subscribedAt: new Date().toISOString(),
    };
  }

  // ── Private helpers ───────────────────────────────────────────────────

  private async findVariant(variantId: string, productId: string, storeId?: string): Promise<ProductVariant> {
    // Verify product ownership first (or find product globally if storeId is undefined)
    await this.findOne(productId, storeId);

    const variant = await this.variantRepo.findOne({ where: { id: variantId, productId } });
    if (!variant) {
      throw new NotFoundException(`Variant "${variantId}" not found on product "${productId}"`);
    }
    return variant;
  }

  private async assertStoreActive(storeId: string): Promise<void> {
    const store = await this.storeRepo.findOne({ where: { id: storeId } });
    if (!store) throw new NotFoundException(`Store "${storeId}" not found`);
    if (store.status !== StoreStatus.ACTIVE) {
      throw new ForbiddenException(
        `Store is not active (current status: "${store.status}"). Products can only be managed on ACTIVE stores.`,
      );
    }
  }

  private async assertCategoryExists(categoryId: string): Promise<void> {
    const cat = await this.categoryRepo.findOne({ where: { id: categoryId } });
    if (!cat) throw new NotFoundException(`Category "${categoryId}" not found`);
  }

  private async assertVariantSkuUnique(sku: string, em: any): Promise<void> {
    const existing = await em.findOne(ProductVariant, { where: { sku } });
    if (existing) {
      throw new ConflictException(`Variant SKU "${sku}" is already in use`);
    }
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const base = slugify(name);
    let slug = base;
    let counter = 1;

    while (true) {
      const qb = this.productRepo.createQueryBuilder('p').where('p.slug = :slug', { slug });
      if (excludeId) qb.andWhere('p.id != :id', { id: excludeId });
      const existing = await qb.getOne();
      if (!existing) break;
      slug = `${base}-${counter++}`;
    }

    return slug;
  }

  private resolveStockStatus(v: ProductVariant): 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' {
    if (v.stockQuantity <= 0) return 'OUT_OF_STOCK';
    if (v.stockQuantity <= v.lowStockThreshold) return 'LOW_STOCK';
    return 'IN_STOCK';
  }
}
