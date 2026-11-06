import 'dotenv/config';
import 'reflect-metadata';
import { Server } from 'net';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './module';

/**
 * Crea la API y la pone a escuchar.
 * - Modo normal: escucha en PORT (o API_PORT).
 * - Modo integrado (API_HOST definido, usado por start.js en el paquete de un
 *   solo sitio): escucha en API_HOST:API_PORT con net.Server#listen. LiteSpeed
 *   (lsnode, usado por Hostinger) reemplaza http.Server#listen e ignora toda
 *   llamada después de la primera, que ya hizo el sitio Next.js.
 */
export async function startApi(): Promise<NestExpressApplication> {
  if (!process.env.JWT_ACCESS_SECRET || process.env.JWT_ACCESS_SECRET.length < 32 || !process.env.JWT_REFRESH_SECRET || process.env.JWT_REFRESH_SECRET.length < 32) throw new Error('Configura JWT_ACCESS_SECRET y JWT_REFRESH_SECRET con al menos 32 caracteres cada uno.');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { abortOnError: false });
  // Detrás del proxy de Hostinger / Nginx: respeta X-Forwarded-* (IP real y HTTPS).
  app.set('trust proxy', 1);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  // WEB_ORIGIN admite varios orígenes separados por comas.
  app.enableCors({ origin: (process.env.WEB_ORIGIN || 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean), credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.enableShutdownHooks();
  const port = Number(process.env.API_PORT || process.env.PORT) || 4000;
  const host = process.env.API_HOST;
  if (host) {
    await app.init();
    const server = app.getHttpServer();
    await new Promise<void>((resolve, reject) => {
      server.once('error', reject);
      Server.prototype.listen.call(server, port, host, () => { server.removeListener('error', reject); resolve(); });
    });
  } else {
    await app.listen(port);
  }
  return app;
}

// start.js (paquete de un solo sitio) define EH_EMBEDDED=1 y llama a startApi()
// por su cuenta, con reintentos.
if (process.env.EH_EMBEDDED !== '1') {
  startApi().catch((err) => { console.error(err); process.exit(1); });
}
