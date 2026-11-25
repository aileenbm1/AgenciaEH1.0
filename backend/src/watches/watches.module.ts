import { Global, Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WatchesController } from './watches.controller';
import { WatchesService } from './watches.service';
@Global()
@Module({ controllers: [WatchesController], providers: [WatchesService, JwtAuthGuard], exports: [WatchesService] })
export class WatchesModule {}
