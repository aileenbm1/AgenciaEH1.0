import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WatchesService } from './watches.service';

@Controller('watches')
export class WatchesController {
  constructor(private svc: WatchesService) {}
  @Get('count/:propertyId') count(@Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.count(id); }
  @Get() @UseGuards(JwtAuthGuard) mine(@Req() r: any) { return this.svc.mine(r.user.sub); }
  @Post('seen') @UseGuards(JwtAuthGuard) seen(@Req() r: any) { return this.svc.seen(r.user.sub); }
  @Get('status/:propertyId') @UseGuards(JwtAuthGuard) status(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.status(r.user.sub, id); }
  @Get('waitlist/:propertyId') @UseGuards(JwtAuthGuard) waitlist(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.waitlist(id, r.user.sub, r.user.role); }
  @Post(':propertyId') @UseGuards(JwtAuthGuard) watch(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Body('shareContact') share?: boolean) { return this.svc.watch(r.user.sub, id, share === true); }
  @Delete(':propertyId') @UseGuards(JwtAuthGuard) unwatch(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.unwatch(r.user.sub, id); }
}
