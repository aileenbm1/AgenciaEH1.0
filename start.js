// Arranque de Agencia EH en UN SOLO sitio Node.js de Hostinger.
//
// - El sitio Next.js escucha donde indique el servidor (en Hostinger, LiteSpeed
//   intercepta ese listen y lo conecta a su socket).
// - La API NestJS corre en el mismo proceso como servicio interno en
//   127.0.0.1 (puerto libre asignado por el sistema). Escucha con net.Server#listen porque LiteSpeed ignora
//   cualquier http.Server#listen después del primero.
// - Si la API no puede arrancar (p. ej. MySQL sin configurar) el sitio sigue en
//   línea, se reintenta con espera creciente (máx. 15 min) y el motivo se ve en
//   /api/v1/health.
const path = require('path');
const os = require('os');

// API_PORT=0: el sistema asigna un puerto libre (en hosting compartido 127.0.0.1
// es común a todas las cuentas, un puerto fijo puede estar ocupado por otra).
// startApi() define API_URL con el puerto real cuando la API está lista.
process.env.API_PORT = process.env.API_PORT || '0';
process.env.API_HOST = process.env.API_HOST || '127.0.0.1';
delete process.env.API_URL;
// Socket de archivo privado para la API (se usa antes que TCP). Va en el /tmp
// propio de la cuenta (CageFS) y lleva el PID para no chocar entre procesos.
process.env.API_SOCKET = process.env.API_SOCKET || path.join(os.tmpdir(), `agencia-eh-api-${process.pid}.sock`);
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.EH_EMBEDDED = '1';
// Algunos servidores definen HOSTNAME con el nombre de la máquina; Next lo usaría
// como dirección de escucha. Se fuerza a escuchar en todas las interfaces.
if (!/^[\d.:]+$/.test(process.env.HOSTNAME || '')) process.env.HOSTNAME = '0.0.0.0';

// Estado compartido con el proxy /api/v1 del sitio (mismo proceso).
const status = (globalThis.__EH_API_STATUS = { state: 'iniciando', error: null, since: new Date().toISOString(), attempts: 0 });

function log(...args) {
  // LiteSpeed redirige stdout a /dev/null; stderr suele llegar al registro.
  console.error('[Agencia EH]', ...args);
}
process.on('unhandledRejection', (err) => log('Error no controlado:', err && err.message ? err.message : err));

// 1) Sitio Next.js (server.js cambia por sí mismo a su carpeta).
require('./web/server.js');

// 2) API, con reintentos.
const apiDir = path.join(__dirname, 'api');
let startApi;
try {
  // dotenv lee api/.env si existe; las variables de hPanel tienen prioridad.
  require('dotenv').config({ path: path.join(apiDir, '.env') });
} catch (_) { /* dotenv vive en api/node_modules; main.js lo carga igualmente */ }
try {
  ({ startApi } = require('./api/dist/main.js'));
} catch (err) {
  status.state = 'error';
  status.error = `No se pudo cargar la API: ${err.message}`;
  log(status.error);
}

async function launch() {
  if (!startApi) return;
  status.attempts += 1;
  try {
    await startApi();
    status.state = 'lista';
    status.error = null;
    status.since = new Date().toISOString();
    delete status.nextRetrySeconds;
    const t = globalThis.__EH_API_TARGET || {};
    status.transport = t.socketPath ? 'socket' : `tcp:${t.port}`;
    log(`API lista (${status.transport})`);
  } catch (err) {
    status.state = 'error';
    status.error = (err && err.response && err.response.message) || (err && err.message) || String(err);
    status.since = new Date().toISOString();
    // Reintentos con espera creciente (30 s, 1, 2, 4, 8 min… máx. 15 min) para no
    // consumir recursos del hosting si el problema persiste.
    const delay = Math.min(30000 * 2 ** (status.attempts - 1), 15 * 60000);
    status.nextRetrySeconds = Math.round(delay / 1000);
    log('La API no pudo iniciar:', status.error, `— reintento en ${status.nextRetrySeconds} s`);
    setTimeout(launch, delay).unref();
  }
}
launch();

// Limpia el socket al terminar.
for (const sig of ['SIGTERM', 'SIGINT']) process.once(sig, () => { try { require('fs').unlinkSync(process.env.API_SOCKET); } catch (_) {} process.exit(0); });
