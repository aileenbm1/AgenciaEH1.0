import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { SiteService } from './site.service';

@Controller('site')
export class SiteController {
  constructor(private readonly svc: SiteService) {}
  /** Público: diseño publicado del sitio (null = diseño original). */
  @Get() get() { return this.svc.publicConfig(); }
}

@Controller('admin/site')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class SiteAdminController {
  constructor(private readonly svc: SiteService) {}
  @Get() editor() { return this.svc.editor(); }
  @Put() save(@Body() d: any) { return this.svc.saveDraft(d); }
  @Post('publish') publish(@Req() r: any, @Body() d: any) { return this.svc.publish(r.user.sub, d); }
  @Post('discard') discard() { return this.svc.discard(); }
  @Post('reset') reset(@Req() r: any) { return this.svc.resetToOriginal(r.user.sub); }
  @Get('versions') versions() { return this.svc.versions(); }
  @Post('versions/:id/restore') restore(@Param('id', ParseUUIDPipe) id: string) { return this.svc.restore(id); }
}
