import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UploadsController } from './uploads.controller';
@Module({ controllers: [UploadsController], providers: [JwtAuthGuard, RolesGuard] })
export class UploadsModule {}
