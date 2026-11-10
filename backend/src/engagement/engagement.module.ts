import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { AgentsService } from './agents.service';
import { AgenciesController, AgentsController, FavoritesController, LeadsController, SavedSearchesController } from './engagement.controller';
import { EngagementService } from './engagement.service';
@Global()
@Module({ controllers: [LeadsController, FavoritesController, SavedSearchesController, AgenciesController, AgentsController], providers: [EngagementService, AgentsService, JwtAuthGuard, RolesGuard], exports: [EngagementService, AgentsService] })
export class EngagementModule {}
