import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
@Module({ controllers: [AdminController], providers: [AdminService, JwtAuthGuard, RolesGuard] })
export class AdminModule {}
