import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { StoreContextGuard } from './store-context.guard.js';

describe('StoreContextGuard (Tenant Isolation)', () => {
  let guard: StoreContextGuard;

  const mockStoreAdminRepo = {
    findOne: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    guard = new StoreContextGuard(mockStoreAdminRepo as any);
  });

  const createMockContext = (user?: any, params: Record<string, string> = {}) => {
    const request: any = {
      user,
      params,
    };

    const context: Partial<ExecutionContext> = {
      switchToHttp: vi.fn().mockReturnValue({
        getRequest: () => request,
      }),
    };

    return { context: context as ExecutionContext, request };
  };

  it('should throw UnauthorizedException if no user is authenticated', async () => {
    const { context } = createMockContext(undefined);

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });

  it('should allow Platform SUPER_ADMIN global access across all stores', async () => {
    const { context } = createMockContext({
      sub: 'admin-uuid',
      isSuperAdmin: true,
    });

    const result = await guard.canActivate(context);
    expect(result).toBe(true);
    expect(mockStoreAdminRepo.findOne).not.toHaveBeenCalled();
  });

  it('should allow Store Admin to access their own store and attach store context to request', async () => {
    const { context, request } = createMockContext(
      { sub: 'vendor-uuid', isSuperAdmin: false },
      { storeId: 'store-1-uuid' },
    );

    mockStoreAdminRepo.findOne.mockResolvedValueOnce({
      userId: 'vendor-uuid',
      storeId: 'store-1-uuid',
      store: { id: 'store-1-uuid', name: 'Vendor Store 1' },
    });

    const result = await guard.canActivate(context);

    expect(result).toBe(true);
    expect(request.storeId).toBe('store-1-uuid');
    expect(request.store.name).toBe('Vendor Store 1');
  });

  it('should block Store Admin from accessing another store (Store A -> Store B ❌)', async () => {
    const { context } = createMockContext(
      { sub: 'vendor-uuid', isSuperAdmin: false },
      { storeId: 'store-2-uuid' }, // Requesting Store 2
    );

    mockStoreAdminRepo.findOne.mockResolvedValueOnce({
      userId: 'vendor-uuid',
      storeId: 'store-1-uuid', // Belongs to Store 1
      store: { id: 'store-1-uuid', name: 'Vendor Store 1' },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });

  it('should throw ForbiddenException if user has no store association', async () => {
    const { context } = createMockContext({
      sub: 'regular-user-uuid',
      isSuperAdmin: false,
    });

    mockStoreAdminRepo.findOne.mockResolvedValueOnce(null);

    await expect(guard.canActivate(context)).rejects.toThrow(ForbiddenException);
  });
});
