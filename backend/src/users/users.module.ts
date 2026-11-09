import { Module } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
@Module({ controllers: [UsersController], providers: [UsersService, JwtAuthGuard, RolesGuard] })
export class UsersModule {}
