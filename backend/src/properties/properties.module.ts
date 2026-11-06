import { Module } from '@nestjs/common'; import { PropertiesController } from './properties.controller'; import { PropertiesService } from './properties.service'; import { JwtAuthGuard } from '../auth/jwt-auth.guard'; import { RolesGuard } from '../auth/roles.guard';
@Module({controllers:[PropertiesController],providers:[PropertiesService,JwtAuthGuard,RolesGuard]}) export class PropertiesModule{}
