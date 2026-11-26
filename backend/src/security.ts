import type { NextFunction, Request, Response } from 'express';

/**
 * Protecciones generales de la API (sin dependencias externas):
 * - Límite de intentos por IP en rutas sensibles (inicio de sesión, contraseñas, registro,
 *   mensajes, reservas…), para frenar ataques de fuerza bruta y spam.
 * - Cabeceras de seguridad en todas las respuestas de la API y de las fotos.
 */
type Rule = { name: string; method: string; re: RegExp; max: number; windowMs: number; message: string };
const MIN = 60_000;
const RULES: Rule[] = [
  { name: 'login', method: 'POST', re: /^\/api\/v1\/auth\/login$/, max: 10, windowMs: 15 * MIN, message: 'Demasiados intentos de inicio de sesión. Espera 15 minutos e inténtalo de nuevo.' },
  { name: 'register', method: 'POST', re: /^\/api\/v1\/auth\/register$/, max: 5, windowMs: 60 * MIN, message: 'Demasiados registros desde esta conexión. Inténtalo más tarde.' },
  { name: 'password', method: 'POST', re: /^\/api\/v1\/auth\/(forgot-password|reset-password|resend-verification|verify-email)$/, max: 8, windowMs: 15 * MIN, message: 'Demasiados intentos. Espera 15 minutos e inténtalo de nuevo.' },
  { name: 'refresh', method: 'POST', re: /^\/api\/v1\/auth\/refresh$/, max: 120, windowMs: 15 * MIN, message: 'Demasiadas solicitudes. Inténtalo más tarde.' },
  { name: 'leads', method: 'POST', re: /^\/api\/v1\/leads$/, max: 10, windowMs: 10 * MIN, message: 'Enviaste muchos mensajes seguidos. Espera unos minutos.' },
  { name: 'reservations', method: 'POST', re: /^\/api\/v1\/reservations$/, max: 15, windowMs: 60 * MIN, message: 'Demasiadas solicitudes de reserva. Inténtalo más tarde.' },
  { name: 'quote', method: 'POST', re: /^\/api\/v1\/reservations\/quote$/, max: 120, windowMs: 5 * MIN, message: 'Demasiadas cotizaciones seguidas. Espera un momento.' },
  { name: 'uploads', method: 'POST', re: /^\/api\/v1\/(uploads\/images|reservations\/[^/]+\/documents)$/, max: 120, windowMs: 15 * MIN, message: 'Demasiados archivos subidos seguidos. Espera un momento.' },
  { name: 'events', method: 'POST', re: /^\/api\/v1\/fanpages\/public\/[^/]+\/events$/, max: 60, windowMs: MIN, message: 'Demasiadas solicitudes.' },
  { name: 'watch', method: 'POST', re: /^\/api\/v1\/watches\//, max: 30, windowMs: 15 * MIN, message: 'Demasiadas solicitudes. Inténtalo más tarde.' },
];
const hits = new Map<string, { n: number; reset: number }>();
setInterval(() => { const now = Date.now(); for (const [k, v] of hits) if (v.reset <= now) hits.delete(k); }, 5 * MIN).unref?.();

export function rateLimit(req: Request, res: Response, next: NextFunction) {
  const path = (req.originalUrl || req.url || '').split('?')[0];
  const rule = RULES.find((r) => r.method === req.method && r.re.test(path));
  if (!rule) return next();
  const now = Date.now(), key = `${rule.name}:${req.ip || 'sin-ip'}`;
  let h = hits.get(key);
  if (!h || h.reset <= now) { h = { n: 0, reset: now + rule.windowMs }; hits.set(key, h); }
  h.n++;
  if (h.n > rule.max) {
    res.setHeader('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
    return res.status(429).json({ statusCode: 429, error: 'Too Many Requests', message: rule.message });
  }
  next();
}

export function securityHeaders(_req: Request, res: Response, next: NextFunction) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  res.removeHeader('X-Powered-By');
  next();
}
