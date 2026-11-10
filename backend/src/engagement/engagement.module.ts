import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AgenciesController, FavoritesController, LeadsController, SavedSearchesController } from './engagement.controller';
import { EngagementService } from './engagement.service';
@Global()
@Module({ controllers: [LeadsController, FavoritesController, SavedSearchesController, AgenciesController], providers: [EngagementService, JwtAuthGuard, RolesGuard], exports: [EngagementService] })
export class EngagementModule {}
