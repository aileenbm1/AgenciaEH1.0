import 'dotenv/config';
import 'reflect-metadata';
import { Server } from 'net';
import { chmodSync, unlinkSync } from 'fs';
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
      await app.init();
      const server = app.getHttpServer();
      // lsnode reemplaza http.Server#listen/#address; se usan las de net.Server.
      const listen = (...args: any[]) => new Promise<void>((resolve, reject) => {
        server.once('error', reject);
        Server.prototype.listen.call(server, ...args, () => { server.removeListener('error', reject); resolve(); });
      });
      let target: { socketPath?: string; host?: string; port?: number } | undefined;
      // 1) Socket de archivo privado: no usa la red. En hosting compartido
      //    127.0.0.1 es común a todas las cuentas y puede estar restringido.
      const socketPath = process.env.API_SOCKET;
      if (socketPath) {
        try {
          try { unlinkSync(socketPath); } catch { /* no existía */ }
          await listen(socketPath);
          try { chmodSync(socketPath, 0o600); } catch { /* opcional */ }
          target = { socketPath };
        } catch (err: any) {
          console.error(`[Agencia EH] No se pudo usar el socket ${socketPath}: ${err?.message}. Se usará TCP.`);
        }
      }
      // 2) Respaldo: TCP en un puerto libre asignado por el sistema (API_PORT=0).
      if (!target) {
        await listen(Number(process.env.API_PORT ?? 0) || 0, host);
        const address = Server.prototype.address.call(server) as { port: number };
        target = { host, port: address.port };
        process.env.API_URL = `http://${host}:${address.port}/api/v1`;
      }
      // El sitio Next.js (mismo proceso) lee aquí la dirección de la API.
      (globalThis as any).__EH_API_TARGET = target;
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
