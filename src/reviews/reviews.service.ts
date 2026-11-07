import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ProductReview } from './entities/product-review.entity.js';
import { ReviewStatus } from './enums/review-status.enum.js';
import { CreateReviewDto } from './dto/create-review.dto.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { ModerateReviewDto } from './dto/moderate-review.dto.js';
import { ReviewQueryDto } from './dto/review-query.dto.js';

import { Product } from '../products/entities/product.entity.js';
import { Order } from '../orders/entities/order.entity.js';
import { OrderItem } from '../orders/entities/order-item.entity.js';
import { OrderStatus } from '../orders/enums/order-status.enum.js';
import { AuditService } from '../audit/audit.service.js';
import { AuditAction } from '../audit/entities/audit-log.entity.js';

export interface ProductReviewSummary {
  averageRating: number;
  totalReviews: number;
  distribution: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
  reviews: ProductReview[];
}

export interface PaginatedReviews {
  data: ProductReview[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(ProductReview)
    private readonly reviewRepo: Repository<ProductReview>,
    @InjectRepository(Product)
    private readonly productRepo: Repository<Product>,
    @InjectRepository(Order)
    private readonly orderRepo: Repository<Order>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
    private readonly auditService: AuditService,
  ) {}

  // ──────────────────────────────────────────────────────────────────────────
  // 1. CREATE REVIEW (STRICTLY GATED TO VERIFIED PURCHASERS)
  // ──────────────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateReviewDto): Promise<ProductReview> {
    const product = await this.productRepo.findOne({ where: { id: dto.productId } });
    if (!product) {
      throw new NotFoundException(`Product with ID ${dto.productId} not found`);
    }

    // Check duplicate review
    const existing = await this.reviewRepo.findOne({
      where: { productId: dto.productId, userId },
    });
    if (existing) {
      throw new ConflictException('You have already submitted a review for this product');
    }

    // STRICT VERIFIED PURCHASER GATE:
    // Check if user has an order containing this product in a confirmed status
    const verifiedOrder = await this.orderRepo
      .createQueryBuilder('o')
      .innerJoin('o.storeOrders', 'so')
      .innerJoin('so.items', 'oi')
      .where('o.customerId = :userId', { userId })
      .andWhere('oi.productId = :productId', { productId: dto.productId })
      .andWhere('o.status IN (:...statuses)', {
        statuses: [
          OrderStatus.PAID,
          OrderStatus.PROCESSING,
          OrderStatus.PARTIALLY_SHIPPED,
          OrderStatus.SHIPPED,
          OrderStatus.DELIVERED,
        ],
      })
      .orderBy('o.createdAt', 'DESC')
      .getOne();

    if (!verifiedOrder) {
      throw new ForbiddenException(
        'Review submission is strictly gated to verified purchasers who have ordered this product.',
      );
    }

    const review = this.reviewRepo.create({
      productId: dto.productId,
      userId,
      orderId: verifiedOrder.id,
      rating: dto.rating,
      title: dto.title ?? null,
      comment: dto.comment,
      status: ReviewStatus.PUBLISHED,
      isVerifiedPurchase: true,
    });

    const saved = await this.reviewRepo.save(review);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.REVIEW_CREATED,
      resource: 'product_review',
      resourceId: saved.id,
      metadata: {
        productId: dto.productId,
        orderId: verifiedOrder.id,
        rating: dto.rating,
      },
    });

    return saved;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 2. PUBLIC PRODUCT REVIEWS & BREAKDOWN
  // ──────────────────────────────────────────────────────────────────────────

  async getProductReviewsSummary(
    productId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<ProductReviewSummary> {
    const skip = (Math.max(1, page) - 1) * Math.min(100, Math.max(1, limit));

    const [reviews, totalReviews] = await this.reviewRepo.findAndCount({
      where: { productId, status: ReviewStatus.PUBLISHED },
      relations: { user: true },
      order: { createdAt: 'DESC' },
      skip,
      take: limit,
    });

    // Rating distribution
    const allPublished = await this.reviewRepo.find({
      where: { productId, status: ReviewStatus.PUBLISHED },
      select: { rating: true },
    });


    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const r of allPublished) {
      const star = r.rating as 1 | 2 | 3 | 4 | 5;
      if (distribution[star] !== undefined) {
        distribution[star]++;
      }
      sum += r.rating;
    }

    const averageRating =
      allPublished.length > 0 ? Number((sum / allPublished.length).toFixed(1)) : 0;

    // Mask user emails for privacy
    for (const r of reviews) {
      if (r.user) {
        r.user.email = r.user.email.replace(/(?<=.{2}).(?=[^@]*?@)/g, '*');
      }
    }

    return {
      averageRating,
      totalReviews,
      distribution,
      reviews,
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CUSTOMER MY REVIEWS
  // ──────────────────────────────────────────────────────────────────────────

  async findMyReviews(userId: string): Promise<ProductReview[]> {
    return this.reviewRepo.find({
      where: { userId },
      relations: { product: true },
      order: { createdAt: 'DESC' },
    });
  }

  async update(id: string, userId: string, dto: UpdateReviewDto): Promise<ProductReview> {
    const review = await this.reviewRepo.findOne({ where: { id, userId } });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    if (dto.rating !== undefined) review.rating = dto.rating;
    if (dto.title !== undefined) review.title = dto.title;
    if (dto.comment !== undefined) review.comment = dto.comment;

    const saved = await this.reviewRepo.save(review);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.REVIEW_UPDATED,
      resource: 'product_review',
      resourceId: saved.id,
      metadata: { rating: saved.rating },
    });

    return saved;
  }

  async remove(id: string, userId: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id, userId } });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    await this.reviewRepo.remove(review);

    await this.auditService.log({
      actorUserId: userId,
      action: AuditAction.REVIEW_DELETED,
      resource: 'product_review',
      resourceId: id,
    });
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 4. PLATFORM ADMIN MODERATION
  // ──────────────────────────────────────────────────────────────────────────

  async findAllAdmin(query: ReviewQueryDto): Promise<PaginatedReviews> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(100, Math.max(1, query.limit ?? 20));
    const skip = (page - 1) * limit;

    const qb = this.reviewRepo
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.product', 'p')
      .leftJoinAndSelect('r.user', 'u')
      .orderBy('r.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (query.status) qb.andWhere('r.status = :status', { status: query.status });
    if (query.rating) qb.andWhere('r.rating = :rating', { rating: query.rating });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  async moderate(
    id: string,
    dto: ModerateReviewDto,
    actorId?: string,
  ): Promise<ProductReview> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    review.status = dto.status;
    if (dto.adminNotes) review.adminNotes = dto.adminNotes;

    const saved = await this.reviewRepo.save(review);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.REVIEW_MODERATED,
      resource: 'product_review',
      resourceId: id,
      metadata: { newStatus: dto.status, adminNotes: dto.adminNotes },
    });

    return saved;
  }

  async removeAdmin(id: string, actorId?: string): Promise<void> {
    const review = await this.reviewRepo.findOne({ where: { id } });
    if (!review) {
      throw new NotFoundException(`Review with ID ${id} not found`);
    }

    await this.reviewRepo.remove(review);

    await this.auditService.log({
      actorUserId: actorId,
      action: AuditAction.REVIEW_DELETED,
      resource: 'product_review',
      resourceId: id,
      metadata: { deletedByAdmin: true },
    });
  }
}
