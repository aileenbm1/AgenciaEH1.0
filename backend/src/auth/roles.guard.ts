import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY, AppRole } from './roles.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest();
    if (!request.user || !roles.includes(request.user.role)) throw new ForbiddenException('No tienes permisos para realizar esta acción.');
    return true;
  }
}
