import { BadRequestException, Controller, Post, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { MEDIA_PREFIX, mediaRoot } from './media';

const MAX_BYTES = 8 * 1024 * 1024;

/** Tipo real según los primeros bytes (no se confía en el nombre ni en el Content-Type). */
function detectImage(buf: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'webp';
  return null;
}

@Controller('uploads')
export class UploadsController {
  @Post('images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('AGENT', 'AGENCY', 'ADMIN')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage(), limits: { fileSize: MAX_BYTES, files: 1, fields: 0 } }))
  upload(@UploadedFile() file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Selecciona una imagen.');
    const ext = detectImage(file.buffer);
    if (!ext) throw new BadRequestException('Formato no permitido. Usa fotos JPG, PNG o WebP.');
    const now = new Date();
    const rel = join('properties', String(now.getUTCFullYear()), String(now.getUTCMonth() + 1).padStart(2, '0'));
    const dir = join(mediaRoot(), rel);
    mkdirSync(dir, { recursive: true });
    const name = `${randomUUID()}.${ext}`;
    writeFileSync(join(dir, name), file.buffer, { mode: 0o644 });
    return { url: `${MEDIA_PREFIX}${rel.split('\\').join('/')}/${name}`, bytes: file.size };
  }
}
