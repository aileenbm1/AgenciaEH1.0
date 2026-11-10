import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { CreatePropertyDto } from './dto/create-property.dto';
import { UpdatePropertyDto } from './dto/update-property.dto';
import { PropertiesService } from './properties.service';
import { CustomFieldInput, CustomFieldsService } from './custom-fields.service';

@Controller('properties')
export class PropertiesController {
  constructor(private service: PropertiesService) {}
  @Get() list(@Query() q: any) { return this.service.publicList(q); }
  @Get('mine') @UseGuards(JwtAuthGuard) mine(@Req() r: any) { return this.service.mine(r.user.sub); }
  @Get('review') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') review() { return this.service.reviewQueue(); }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.service.bySlug(slug); }
  @Post() @UseGuards(JwtAuthGuard, RolesGuard) @Roles('AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN') create(@Req() r: any, @Body() d: CreatePropertyDto) { return this.service.create(r.user.sub, r.user.role, d); }
  @Patch(':id') @UseGuards(JwtAuthGuard) update(@Req() r: any, @Param('id') id: string, @Body() d: UpdatePropertyDto) { return this.service.update(id, r.user.sub, r.user.role, d); }
  @Patch(':id/availability') @UseGuards(JwtAuthGuard) availability(@Req() r: any, @Param('id') id: string, @Body() b: { availability: string; availableFrom?: string | null }) {
    return this.service.setAvailability(id, r.user.sub, r.user.role, String(b?.availability || ''), b?.availableFrom);
  }
  @Post(':id/submit') @UseGuards(JwtAuthGuard) submit(@Req() r: any, @Param('id') id: string) { return this.service.submit(id, r.user.sub); }
  @Patch(':id/moderate') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') moderate(@Param('id') id: string, @Body('status') status: string) { return this.service.moderate(id, status); }
  @Delete(':id') @UseGuards(JwtAuthGuard) remove(@Req() r: any, @Param('id') id: string) { return this.service.remove(id, r.user.sub, r.user.role); }
}

/** RF-03: campos personalizados. Lectura pública; alta y edición solo para administradores. */
@Controller()
export class CustomFieldsController {
  constructor(private fields: CustomFieldsService) {}
  @Get('custom-fields') list() { return this.fields.list(); }
  @Get('admin/custom-fields') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') all() { return this.fields.list(true); }
  @Post('admin/custom-fields') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') create(@Body() d: CustomFieldInput) { return this.fields.create(d); }
  @Patch('admin/custom-fields/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') update(@Param('id', ParseUUIDPipe) id: string, @Body() d: CustomFieldInput) { return this.fields.update(id, d); }
  @Delete('admin/custom-fields/:id') @UseGuards(JwtAuthGuard, RolesGuard) @Roles('ADMIN') remove(@Param('id', ParseUUIDPipe) id: string) { return this.fields.remove(id); }
}
