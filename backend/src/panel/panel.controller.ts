import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PanelService } from './panel.service';

@Controller('panel')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PanelController {
  constructor(private readonly svc: PanelService) {}
  @Get('pending') @Roles('AGENT', 'AGENCY', 'DEVELOPER') pending(@Req() r: any) { return this.svc.pending(r.user.sub, r.user.role); }
  @Get('payout') @Roles('AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN') payout(@Req() r: any) { return this.svc.getPayout(r.user.sub); }
  @Put('payout') @Roles('AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN') savePayout(@Req() r: any, @Body() d: any) { return this.svc.savePayout(r.user.sub, d); }
  @Get('membership') @Roles('AGENT', 'AGENCY', 'DEVELOPER') membership(@Req() r: any) { return this.svc.membership(r.user.sub); }
  @Get('team') @Roles('AGENCY', 'DEVELOPER') team(@Req() r: any) { return this.svc.team(r.user.sub); }
}

@Controller('admin/membership-payinfo')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MembershipPayInfoController {
  constructor(private readonly svc: PanelService) {}
  @Get() get() { return this.svc.membershipPayInfo(); }
  @Put() save(@Body() d: any) { return this.svc.saveMembershipPayInfo(d); }
}
