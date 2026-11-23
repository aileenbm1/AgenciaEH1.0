import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// La carpeta frontend/ es la raíz del proyecto Next.js aunque el repositorio
// tenga su propio package.json (despliegue en Hostinger). Así el servidor
// standalone queda en .next/standalone/server.js.
const root = dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = { output: 'standalone', outputFileTracingRoot: root, turbopack: { root } };
export default nextConfig;
