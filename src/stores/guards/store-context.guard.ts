import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StoreAdmin } from '../entities/store-admin.entity.js';
import { Store } from '../entities/store.entity.js';
import type { JwtPayload } from '../../common/types/auth.types.js';

@Injectable()
export class StoreContextGuard implements CanActivate {
  constructor(
    @InjectRepository(StoreAdmin)
    private storeAdminRepo: Repository<StoreAdmin>,
    @Optional()
    @InjectRepository(Store)
    private storeRepo?: Repository<Store>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user: JwtPayload | undefined = request.user;

    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    // 1. Platform SUPER_ADMIN has global access across all stores
    if (user.isSuperAdmin) {
      // Check if store ID is passed in headers, query, or params
      const explicitStoreId =
        request.headers?.['x-store-id'] ||
        request.headers?.['store-id'] ||
        request.query?.storeId ||
        request.params?.storeId;

      if (explicitStoreId && this.storeRepo) {
        const store = await this.storeRepo.findOne({
          where: { id: explicitStoreId as string },
        });
        if (store) {
          request.store = store;
          request.storeId = store.id;
          return true;
        }
      }

      // Check if target param :id is itself a store
      if (request.params?.id && this.storeRepo) {
        const storeById = await this.storeRepo.findOne({
          where: { id: request.params.id },
        });
        if (storeById) {
          request.store = storeById;
          request.storeId = storeById.id;
          return true;
        }
      }

      // Fallback: attach any existing store so @CurrentStore() is not null
      if (this.storeRepo) {
        const fallbackStore = await this.storeRepo.findOne({
          where: {},
          order: { createdAt: 'ASC' },
        });
        if (fallbackStore) {
          request.store = fallbackStore;
          request.storeId = fallbackStore.id;
        }
      }

      return true;
    }

    // 2. Resolve StoreAdmin relation for current user
    const storeAdmin = await this.storeAdminRepo.findOne({
      where: { userId: user.sub },
      relations: { store: true },
    });

    if (storeAdmin?.store) {
      // If a route specifies :storeId as store parameter, verify ownership
      const targetStoreId = request.params?.storeId;
      if (targetStoreId && targetStoreId !== storeAdmin.storeId) {
        throw new ForbiddenException(
          'Access denied: You do not have permission to access another store',
        );
      }

      // Attach store context to request for downstream handlers & decorators
      request.store = storeAdmin.store;
      request.storeId = storeAdmin.storeId;
      return true;
    }

    throw new ForbiddenException('User is not associated with any store');
  }
}
