import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator.js';
import type { JwtPayload } from '../types/auth.types.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No permissions decorator → allow (JWT guard already verified auth)
    if (!required || required.length === 0) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest<{ user: JwtPayload }>();

    // SUPER_ADMIN bypasses permission checks
    if (user?.isSuperAdmin) {
      return true;
    }

    const userPermissions = new Set(user?.permissions ?? []);
    const hasAll = required.every((p) => userPermissions.has(p));

    if (!hasAll) {
      throw new ForbiddenException(
        `Insufficient permissions. Required: ${required.join(', ')}`,
      );
    }

    return true;
  }
}
