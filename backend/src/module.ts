import { Module, Controller, Get } from '@nestjs/common'; import { AuthModule } from './auth/auth.module'; import { AdminController } from './admin.controller'; import { PropertiesModule } from './properties/properties.module'; import { DatabaseModule } from './database/database.module'; import { DatabaseService } from './database/database.service'; import { UploadsModule } from './uploads/uploads.module'; import { MailModule } from './mail/mail.module'; import { MailService } from './mail/mail.service'; import { mediaRoot } from './uploads/media';
@Controller('health') class HealthController {
  constructor(private readonly db: DatabaseService, private readonly mail: MailService) {}
  @Get() check() { return { status: this.db.schema.ok ? 'ok' : 'degradado', service: 'agencia-eh-api', version: '0.11.0', database: 'mysql', tablas: this.db.schema, fotos: fotosStatus(), correo: this.mail.status }; }
}
@Module({imports:[DatabaseModule,MailModule,AuthModule,PropertiesModule,UploadsModule],controllers:[HealthController,AdminController]}) export class AppModule{}

function fotosStatus() { try { mediaRoot(); return { ok: true }; } catch (e: any) { return { ok: false, error: e?.message }; } }
