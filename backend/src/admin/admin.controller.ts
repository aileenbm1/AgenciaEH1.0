import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AdminService } from './admin.service';
import { CreatePaymentDto, DeleteUserDto, SetPasswordDto, UpdateUserDto } from './admin.dto';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('access-check') check() { return { success: true, message: 'Acceso administrativo autorizado.' }; }
  @Get('metrics') metrics() { return this.admin.metrics(); }
  @Get('users') users(@Query() q: any) { return this.admin.users(q); }
  @Patch('users/:id') updateUser(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateUserDto) { return this.admin.updateUser(r.user.sub, id, d); }
  @Post('users/:id/password') setPassword(@Param('id', ParseUUIDPipe) id: string, @Body() d: SetPasswordDto) { return this.admin.setPassword(id, d.password); }
  @Post('users/:id/password-link') passwordLink(@Param('id', ParseUUIDPipe) id: string) { return this.admin.passwordLink(id); }
  // POST (no DELETE) porque lleva cuerpo con la confirmación.
  @Post('users/:id/delete') deleteUser(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() d: DeleteUserDto) { return this.admin.deleteUser(r.user.sub, id, d); }
  @Get('payments') payments(@Query() q: any) { return this.admin.payments(q); }
  @Post('payments') createPayment(@Req() r: any, @Body() d: CreatePaymentDto) { return this.admin.createPayment(r.user.sub, d); }
  @Delete('payments/:id') deletePayment(@Param('id', ParseUUIDPipe) id: string) { return this.admin.deletePayment(id); }
}
