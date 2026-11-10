import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Put, Query, Req, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ReservationsService } from './reservations.service';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly svc: ReservationsService) {}

  // Público: calendario de disponibilidad y cotización (sin datos personales).
  @Get('calendar/:propertyId') calendar(@Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.calendar(id); }
  @Post('quote') quote(@Body() d: any) { return this.svc.quote(d); }

  // Configuración y bloqueos (anunciante / admin).
  @Get('settings/:propertyId') @UseGuards(JwtAuthGuard) settings(@Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.getSettings(id); }
  @Put('settings/:propertyId') @UseGuards(JwtAuthGuard) saveSettings(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Body() d: any) { return this.svc.saveSettings(r.user.sub, r.user.role, id, d); }
  @Get('blocks/:propertyId') @UseGuards(JwtAuthGuard) blocks(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string) { return this.svc.blocks(r.user.sub, r.user.role, id); }
  @Post('blocks/:propertyId') @UseGuards(JwtAuthGuard) addBlock(@Req() r: any, @Param('propertyId', ParseUUIDPipe) id: string, @Body() d: any) { return this.svc.addBlock(r.user.sub, r.user.role, id, d); }
  @Delete('blocks/item/:blockId') @UseGuards(JwtAuthGuard) removeBlock(@Req() r: any, @Param('blockId', ParseUUIDPipe) id: string) { return this.svc.removeBlock(r.user.sub, r.user.role, id); }

  // Reservas (requieren cuenta).
  @Post() @UseGuards(JwtAuthGuard) create(@Req() r: any, @Body() d: any) { return this.svc.create(r.user.sub, d); }
  @Get() @UseGuards(JwtAuthGuard) list(@Req() r: any, @Query('as') as?: string, @Query('status') status?: string) { return this.svc.list(r.user.sub, r.user.role, String(as || ''), status ? String(status) : undefined); }
  @Get(':id') @UseGuards(JwtAuthGuard) detail(@Req() r: any, @Param('id', ParseUUIDPipe) id: string) { return this.svc.detail(r.user.sub, r.user.role, id); }
  @Patch(':id') @UseGuards(JwtAuthGuard) action(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body() d: any) { return this.svc.action(r.user.sub, r.user.role, id, d); }
  @Post(':id/messages') @UseGuards(JwtAuthGuard) message(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Body('body') body: string) { return this.svc.message(r.user.sub, r.user.role, id, body); }
  @Post(':id/documents') @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file?: Express.Multer.File, @Body('kind') kind?: string) { return this.svc.upload(r.user.sub, r.user.role, id, file, kind); }
  @Get(':id/documents/:docId') @UseGuards(JwtAuthGuard)
  async document(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string, @Res({ passthrough: true }) res: Response) {
    const d = await this.svc.document(r.user.sub, r.user.role, id, docId);
    res.set({ 'Content-Type': d.mime, 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(d.name)}`, 'Cache-Control': 'private, no-store' });
    return new StreamableFile(d.stream);
  }
  @Delete(':id/documents/:docId') @UseGuards(JwtAuthGuard) removeDocument(@Req() r: any, @Param('id', ParseUUIDPipe) id: string, @Param('docId', ParseUUIDPipe) docId: string) { return this.svc.removeDocument(r.user.sub, r.user.role, id, docId); }
}
