import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './module';
async function bootstrap() {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32 || !process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) throw new Error('Configura secretos JWT de al menos 32 caracteres en .env');
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Detrás del proxy de Hostinger / Nginx: respeta X-Forwarded-* (IP real y HTTPS).
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  // WEB_ORIGIN admite varios orígenes separados por comas.
  app.enableCors({ origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  // API_PORT/API_HOST permiten correr la API como servicio interno junto al sitio
  // (paquete de un solo sitio para Hostinger); si no existen se usa PORT.
  const port = Number(process.env.API_PORT || process.env.PORT) || 4000;
  if (process.env.API_HOST) await app.listen(port, process.env.API_HOST);
  else await app.listen(port);
}
bootstrap();
