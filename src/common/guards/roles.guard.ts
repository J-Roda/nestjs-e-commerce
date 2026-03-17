import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '../enums/role.enum';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // 1. Read what roles are required for this route
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(), // check method-level decorator first
      context.getClass(), // then check controller-level decorator
    ]);

    // 2. If no @Roles() decorator on this route, allow everyone through
    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    // 3. Get the user from the request (attached by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user as { id: string; email: string; role: Role };

    // 4. Check if user has no role at all
    if (!user || !user.role) {
      throw new ForbiddenException('Access denied');
    }

    // 5. Check if user's role is in the required roles list
    const hasRole = requiredRoles.includes(user.role);

    if (!hasRole) {
      throw new ForbiddenException(`Access denied. Required roles: ${requiredRoles.join(', ')}`);
    }

    return true;
  }
}
