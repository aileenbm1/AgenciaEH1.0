import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { SiteAdminController, SiteController } from './site.controller';
import { SiteService } from './site.service';
@Module({ controllers: [SiteController, SiteAdminController], providers: [SiteService, JwtAuthGuard, RolesGuard] })
export class SiteModule {}
