import 'dotenv/config';
import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import cookieParser from 'cookie-parser';
import { AppModule } from './module';
async function bootstrap() {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32 || !process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) throw new Error('Configura secretos JWT de al menos 32 caracteres en .env');
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  app.enableCors({ origin: process.env.WEB_ORIGIN || 'http://localhost:3000', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  await app.listen(process.env.PORT || 4000);
}
bootstrap();
