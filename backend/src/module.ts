import { Module, Controller, Get } from '@nestjs/common'; import { AuthModule } from './auth/auth.module'; import { AdminController } from './admin.controller'; import { PropertiesModule } from './properties/properties.module'; import { DatabaseModule } from './database/database.module'; import { DatabaseService } from './database/database.service'; import { UploadsModule } from './uploads/uploads.module'; import { mediaRoot } from './uploads/media';
@Controller('health') class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get() check() { return { status: this.db.schema.ok ? 'ok' : 'degradado', service: 'agencia-eh-api', version: '0.10.0', database: 'mysql', tablas: this.db.schema, fotos: fotosStatus() }; }
}
@Module({imports:[DatabaseModule,AuthModule,PropertiesModule,UploadsModule],controllers:[HealthController,AdminController]}) export class AppModule{}

function fotosStatus() { try { mediaRoot(); return { ok: true }; } catch (e: any) { return { ok: false, error: e?.message }; } }
