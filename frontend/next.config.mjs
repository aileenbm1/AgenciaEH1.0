import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// La carpeta frontend/ es la raíz del proyecto Next.js aunque el repositorio
// tenga su propio package.json (despliegue en Hostinger). Así el servidor
// standalone queda en .next/standalone/server.js.
const root = dirname(fileURLToPath(import.meta.url));

// Cabeceras de seguridad para todo el sitio. La política de contenido (CSP) solo permite cargar
// scripts del propio sitio y videos/recorridos de YouTube, Vimeo, Matterport y Kuula.
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "img-src 'self' data: blob: https:",
  "connect-src 'self' https://nominatim.openstreetmap.org",
  "frame-src 'self' https://www.youtube-nocookie.com https://player.vimeo.com https://my.matterport.com https://kuula.co https://www.openstreetmap.org",
  "media-src 'self' https:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
].join('; ');
const securityHeaders = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(self), payment=()' },
  ...(process.env.NODE_ENV === 'production' ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' }] : []),
];

/** @type {import('next').NextConfig} */
const nextConfig = { output: 'standalone', outputFileTracingRoot: root, turbopack: { root }, poweredByHeader: false,
  async headers() { return [{ source: '/:path*', headers: securityHeaders }]; } };
export default nextConfig;
