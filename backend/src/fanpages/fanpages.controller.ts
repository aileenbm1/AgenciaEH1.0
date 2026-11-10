import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { FanpagesService } from './fanpages.service';

@Controller('fanpages')
export class FanpagesController {
  constructor(private readonly svc: FanpagesService) {}

  // Público: diseño publicado (o el automático) y registro de visitas/clics.
  @Get('public/:slug') publicPage(@Param('slug') slug: string) { return this.svc.publicBySlug(slug); }
  @Post('public/:slug/events') track(@Req() r: any, @Param('slug') slug: string, @Body() d: any) { return this.svc.track(slug, d, r.ip || 'local'); }

  // Editor (anunciante con rol permitido, su agencia o admin).
  @Get('templates') @UseGuards(JwtAuthGuard) templates() { return this.svc.templates(); }
  @Get(':propertyId') @UseGuards(JwtAuthGuard) get(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.get(r.user.sub, r.user.role, id); }
  @Put(':propertyId') @UseGuards(JwtAuthGuard) save(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Body() d: any) { return this.svc.save(r.user.sub, r.user.role, id, d); }
  @Post(':propertyId/publish') @UseGuards(JwtAuthGuard) publish(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.publish(r.user.sub, r.user.role, id); }
  @Post(':propertyId/unpublish') @UseGuards(JwtAuthGuard) unpublish(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.unpublish(r.user.sub, r.user.role, id); }
  @Get(':propertyId/versions') @UseGuards(JwtAuthGuard) versions(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.versions(r.user.sub, r.user.role, id); }
  @Post(':propertyId/versions/:versionId/restore') @UseGuards(JwtAuthGuard) restore(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Param('versionId', ParseUUIDPipe) v: string) { return this.svc.restore(r.user.sub, r.user.role, id, v); }
  @Post(':propertyId/template/:templateId') @UseGuards(JwtAuthGuard) applyTemplate(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Param('templateId', ParseUUIDPipe) t: string) { return this.svc.applyTemplate(r.user.sub, r.user.role, id, t); }
  @Get(':propertyId/stats') @UseGuards(JwtAuthGuard) stats(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.stats(r.user.sub, r.user.role, id); }
}

@Controller('admin/fanpages')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class FanpagesAdminController {
  constructor(private readonly svc: FanpagesService) {}
  @Get('settings') settings() { return this.svc.settings(); }
  @Put('settings') saveSettings(@Body() d: any) { return this.svc.saveSettings(d); }
  @Get('pending') pending() { return this.svc.pending(); }
  @Post('review/:propertyId') review(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Body() d: any) { return this.svc.review(r.user.sub, id, d); }
  @Get('templates') templates() { return this.svc.templates(true); }
  @Post('templates') createTemplate(@Body() d: any) { return this.svc.saveAsTemplate(d); }
  @Patch('templates/:id') updateTemplate(@Param('id', ParseUUIDPipe) id: string, @Body() d: any) { return this.svc.updateTemplate(id, d); }
  @Delete('templates/:id') deleteTemplate(@Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteTemplate(id); }
}
