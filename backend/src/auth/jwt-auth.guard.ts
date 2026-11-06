import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const header = request.headers.authorization as string | undefined;
    if (!header?.startsWith('Bearer ')) throw new UnauthorizedException('Inicia sesión para continuar.');
    try { request.user = await this.jwt.verifyAsync(header.slice(7), { secret: process.env.JWT_ACCESS_SECRET }); return true; }
    catch { throw new UnauthorizedException('La sesión expiró. Inicia sesión nuevamente.'); }
  }
}
