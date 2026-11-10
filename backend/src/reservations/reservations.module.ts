import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReservationsController } from './reservations.controller';
import { ReservationsService } from './reservations.service';
@Module({ controllers: [ReservationsController], providers: [ReservationsService, JwtAuthGuard] })
export class ReservationsModule {}
