import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/jwt-auth.guard'; import { RolesGuard } from './auth/roles.guard'; import { Roles } from './auth/roles.decorator';
@Controller('admin') @UseGuards(JwtAuthGuard,RolesGuard) @Roles('ADMIN') export class AdminController { @Get('access-check') check(){return {success:true,message:'Acceso administrativo autorizado.'};} }
