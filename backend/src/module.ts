import { Module, Controller, Get } from '@nestjs/common'; import { AuthModule } from './auth/auth.module'; import { AdminController } from './admin.controller'; import { PropertiesModule } from './properties/properties.module'; import { DatabaseModule } from './database/database.module'; import { DatabaseService } from './database/database.service';
@Controller('health') class HealthController {
  constructor(private readonly db: DatabaseService) {}
  @Get() check() { return { status: this.db.schema.ok ? 'ok' : 'degradado', service: 'agencia-eh-api', version: '0.9.0', database: 'mysql', tablas: this.db.schema }; }
}
@Module({imports:[DatabaseModule,AuthModule,PropertiesModule],controllers:[HealthController,AdminController]}) export class AppModule{}
