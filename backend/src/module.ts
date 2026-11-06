import { Module, Controller, Get } from '@nestjs/common'; import { AuthModule } from './auth/auth.module'; import { AdminController } from './admin.controller'; import { PropertiesModule } from './properties/properties.module'; import { DatabaseModule } from './database/database.module';
@Controller('health') class HealthController { @Get() check(){return {status:'ok',service:'agencia-eh-api',version:'0.8.1',database:'mysql'};} }
@Module({imports:[DatabaseModule,AuthModule,PropertiesModule],controllers:[HealthController,AdminController]}) export class AppModule{}
