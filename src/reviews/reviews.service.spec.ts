import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, ConflictException } from '@nestjs/common';
import { ReviewsService } from './reviews.service.js';
import { ReviewStatus } from './enums/review-status.enum.js';

describe('ReviewsService (Verified Purchaser Strict Gating & Moderation)', () => {
  let service: ReviewsService;
  let reviewRepo: any;
  let productRepo: any;
  let orderRepo: any;
  let orderItemRepo: any;
  let auditService: any;

  beforeEach(() => {
    reviewRepo = {
      create: vi.fn((data) => ({ ...data, id: 'rev-1' })),
      save: vi.fn((data) => Promise.resolve({ ...data, id: data.id || 'rev-1' })),
      findOne: vi.fn(),
      find: vi.fn(),
      findAndCount: vi.fn(),
      remove: vi.fn(),
    };

    productRepo = {
      findOne: vi.fn(),
    };

    orderRepo = {
      createQueryBuilder: vi.fn(),
    };

    orderItemRepo = {};

    auditService = {
      log: vi.fn().mockResolvedValue(undefined),
    };

    service = new ReviewsService(
      reviewRepo,
      productRepo,
      orderRepo,
      orderItemRepo,
      auditService,
    );
  });

  describe('STRICT VERIFIED PURCHASER GATING', () => {
    it('should REJECT review submission if user has NEVER purchased the product (unverified user)', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'prod-1', name: 'Winter Coat' });
      reviewRepo.findOne.mockResolvedValue(null); // No prior review

      // QueryBuilder returns null (user never purchased product)
      const qb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(null),
      };
      orderRepo.createQueryBuilder.mockReturnValue(qb);

      await expect(
        service.create('unverified-user-1', {
          productId: 'prod-1',
          rating: 5,
          comment: 'Looks amazing!',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should ALLOW review submission when user has confirmed purchased order for the product', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'prod-1', name: 'Winter Coat' });
      reviewRepo.findOne.mockResolvedValue(null);

      const verifiedOrder = { id: 'order-verified-123' };
      const qb = {
        innerJoin: vi.fn().mockReturnThis(),
        where: vi.fn().mockReturnThis(),
        andWhere: vi.fn().mockReturnThis(),
        orderBy: vi.fn().mockReturnThis(),
        getOne: vi.fn().mockResolvedValue(verifiedOrder),
      };
      orderRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.create('verified-user-1', {
        productId: 'prod-1',
        rating: 5,
        title: 'Outstanding quality',
        comment: 'Very warm and comfortable coat, highly recommend!',
      });

      expect(result).toBeDefined();
      expect(result.isVerifiedPurchase).toBe(true);
      expect(result.orderId).toBe('order-verified-123');
      expect(result.status).toBe(ReviewStatus.PUBLISHED);
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'REVIEW_CREATED' }),
      );
    });

    it('should REJECT duplicate review if user has already reviewed the product', async () => {
      productRepo.findOne.mockResolvedValue({ id: 'prod-1', name: 'Winter Coat' });
      reviewRepo.findOne.mockResolvedValue({ id: 'existing-rev' });

      await expect(
        service.create('user-1', {
          productId: 'prod-1',
          rating: 4,
          comment: 'Another review attempt',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('PUBLIC RATINGS SUMMARY & BREAKDOWN', () => {
    it('should compute average rating and star distribution properly', async () => {
      reviewRepo.findAndCount.mockResolvedValue([
        [
          { id: '1', rating: 5, comment: 'Great', user: { email: 'test@example.fi' } },
          { id: '2', rating: 4, comment: 'Good', user: { email: 'other@example.fi' } },
        ],
        2,
      ]);

      reviewRepo.find.mockResolvedValue([
        { rating: 5 },
        { rating: 4 },
      ]);

      const summary = await service.getProductReviewsSummary('prod-1', 1, 10);
      expect(summary.totalReviews).toBe(2);
      expect(summary.averageRating).toBe(4.5);
      expect(summary.distribution[5]).toBe(1);
      expect(summary.distribution[4]).toBe(1);
      expect(summary.distribution[1]).toBe(0);
    });
  });
});
