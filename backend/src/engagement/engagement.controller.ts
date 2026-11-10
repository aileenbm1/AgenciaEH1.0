import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreateLeadDto, SaveSearchDto, UpdateAgencyDto, UpdateAgentDto, UpdateLeadDto, UpdateSearchDto } from './engagement.dto';
import { EngagementService } from './engagement.service';
import { AgentsService } from './agents.service';

@Controller('leads')
export class LeadsController {
  constructor(private readonly svc: EngagementService, private readonly jwt: JwtService) {}
  /** Público: contacto o solicitud de visita desde la ficha. Si hay sesión, se liga al usuario. */
  @Post() async create(@Req() r: any, @Body() d: CreateLeadDto) {
    let userId: string | undefined;
    const h = r.headers.authorization as string | undefined;
    if (h?.startsWith('Bearer ')) { try { userId = (await this.jwt.verifyAsync(h.slice(7), { secret: process.env.JWT_ACCESS_SECRET })).sub; } catch { /* sin sesión */ } }
    return this.svc.createLead(d, r.ip, userId);
  }
  @Get('mine') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN') mine(@Req() r: any, @Query('scope') scope?: string) { return this.svc.myLeads(r.user.sub, r.user.role, scope); }
  @Get('sent') @UseGuards(JwtAuthGuard) sent(@Req() r: any) { return this.svc.sentLeads(r.user.sub); }
  @Patch(':id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN') update(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateLeadDto) { return this.svc.updateLead(r.user.sub, r.user.role, id, d); }
}

@Controller('favorites')
@UseGuards(JwtAuthGuard)
export class FavoritesController {
  constructor(private readonly svc: EngagementService) {}
  @Get() list(@Req() r: any) { return this.svc.favorites(r.user.sub); }
  @Get('ids') ids(@Req() r: any) { return this.svc.favoriteIds(r.user.sub); }
  @Post(':propertyId') add(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.addFavorite(r.user.sub, id); }
  @Delete(':propertyId') remove(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.removeFavorite(r.user.sub, id); }
}

@Controller('saved-searches')
@UseGuards(JwtAuthGuard)
export class SavedSearchesController {
  constructor(private readonly svc: EngagementService) {}
  @Get() list(@Req() r: any) { return this.svc.searches(r.user.sub); }
  @Post() create(@Req() r: any, @Body() d: SaveSearchDto) { return this.svc.saveSearch(r.user.sub, d); }
  @Patch(':id') update(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() d: UpdateSearchDto) { return this.svc.updateSearch(r.user.sub, id, d.alerts); }
  @Delete(':id') remove(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) { return this.svc.deleteSearch(r.user.sub, id); }
}

@Controller('agencies')
export class AgenciesController {
  constructor(private readonly svc: EngagementService) {}
  @Get('me') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENCY', 'DEVELOPER') me(@Req() r: any) { return this.svc.myAgency(r.user.sub); }
  @Patch('me') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENCY', 'DEVELOPER') update(@Req() r: any, @Body() d: UpdateAgencyDto) { return this.svc.updateMyAgency(r.user.sub, d); }
  @Get(':slug') bySlug(@Param('slug') slug: string) { return this.svc.agencyBySlug(slug); }
}

@Controller('agents')
export class AgentsController {
  constructor(private readonly svc: AgentsService) {}
  @Get('me') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENT') me(@Req() r: any) { return this.svc.me(r.user.sub); }
  @Patch('me') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENT') update(@Req() r: any, @Body() d: UpdateAgentDto) { return this.svc.update(r.user.sub, d); }
  /** Estadísticas del perfil (agente: las suyas; agencia/desarrolladora: de todo el equipo). */
  @Get('stats/me') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENT', 'AGENCY', 'DEVELOPER') stats(@Req() r: any) { return this.svc.stats(r.user.sub, r.user.role); }
  @Get(':slug') bySlug(@Param('slug') slug: string) { return this.svc.bySlug(slug); }
}
