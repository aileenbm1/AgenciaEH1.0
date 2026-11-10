import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateUserDto } from './users.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'AGENCY', 'DEVELOPER', 'AGENT')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Get('mine') mine(@Req() r: any) { return this.users.mine(r.user.sub); }
  @Post() create(@Req() r: any, @Body() d: CreateUserDto) { return this.users.create(r.user.sub, d); }
  @Post(':id/invite') invite(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) { return this.users.resendInvite(r.user.sub, id); }
}
