// Arranque de Agencia EH en UN SOLO sitio Node.js de Hostinger.
// Levanta la API NestJS como servicio interno (127.0.0.1:API_PORT) y el sitio
// Next.js en el puerto que asigna Hostinger (PORT). El navegador solo ve el
// sitio; las llamadas a /api/v1 se reenvían internamente a la API.
const path = require('path');

const apiPort = process.env.API_PORT || '4000';
process.env.API_PORT = apiPort;
process.env.API_HOST = process.env.API_HOST || '127.0.0.1';
process.env.API_URL = process.env.API_URL || `http://127.0.0.1:${apiPort}/api/v1`;
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
// Algunos servidores definen HOSTNAME con el nombre de la máquina; Next lo usaría
// como dirección de escucha. Se fuerza a escuchar en todas las interfaces.
if (!/^[\d.:]+$/.test(process.env.HOSTNAME || '')) process.env.HOSTNAME = '0.0.0.0';

// Si la API falla (p. ej. MySQL mal configurado) el sitio sigue en línea y
// muestra «API no disponible»; el error queda en el registro.
process.on('unhandledRejection', (err) => console.error('[Agencia EH · API]', err && err.message ? err.message : err));

// 1) API: lee api/.env si existe (las variables de hPanel tienen prioridad).
process.chdir(path.join(__dirname, 'api'));
require('./api/dist/main.js');

// 2) Sitio Next.js (server.js cambia por sí mismo a su carpeta).
require('./web/server.js');
