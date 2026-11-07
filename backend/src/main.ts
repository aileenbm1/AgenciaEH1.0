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
  const host = process.env.API_HOST;
  try {
    if (host) {
      // Modo integrado: API_PORT=0 (por defecto en start.js) pide un puerto libre
      // al sistema. En hosting compartido 127.0.0.1 es común a todas las cuentas
      // del servidor, así que un puerto fijo puede estar ocupado por otra cuenta.
      const wanted = Number(process.env.API_PORT ?? 0) || 0;
      await app.init();
      const server = app.getHttpServer();
      await new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        Server.prototype.listen.call(server, wanted, host, () => { server.removeListener('error', reject); resolve(); });
      });
      // lsnode reemplaza http.Server#address; se usa la implementación original.
      const address = Server.prototype.address.call(server) as { port: number };
      process.env.API_URL = `http://${host}:${address.port}/api/v1`;
    } else {
      await app.listen(Number(process.env.API_PORT || process.env.PORT) || 4000);
    }
  } catch (err) {
    await app.close().catch(() => undefined);
    throw err;
  }
  return app;
}

// start.js (paquete de un solo sitio) define EH_EMBEDDED=1 y llama a startApi()
// por su cuenta, con reintentos.
if (process.env.EH_EMBEDDED !== '1') {
  startApi().catch((err) => { console.error(err); process.exit(1); });
}
