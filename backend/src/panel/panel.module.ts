import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { MembershipPayInfoController, PanelController } from './panel.controller';
import { PanelService } from './panel.service';
@Module({ controllers: [PanelController, MembershipPayInfoController], providers: [PanelService, JwtAuthGuard, RolesGuard] })
export class PanelModule {}
