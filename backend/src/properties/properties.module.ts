import { Module } from '@nestjs/common';
import { CustomFieldsController, PropertiesController } from './properties.controller';
import { PropertiesService } from './properties.service';
import { CustomFieldsService } from './custom-fields.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
@Module({ controllers: [PropertiesController, CustomFieldsController], providers: [PropertiesService, CustomFieldsService, JwtAuthGuard, RolesGuard] })
export class PropertiesModule {}
