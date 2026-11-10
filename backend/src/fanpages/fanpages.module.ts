import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { FanpagesAdminController, FanpagesController } from './fanpages.controller';
import { FanpagesService } from './fanpages.service';
@Module({ controllers: [FanpagesController, FanpagesAdminController], providers: [FanpagesService, JwtAuthGuard, RolesGuard] })
export class FanpagesModule {}
