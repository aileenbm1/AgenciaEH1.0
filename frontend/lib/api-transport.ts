// Transporte del servidor de Next.js hacia la API NestJS (solo servidor).
//
// - Paquete de un solo sitio (Hostinger): start.js publica en globalThis el
//   estado y la dirección de la API integrada, que suele ser un socket de archivo
//   privado (no usa la red; en hosting compartido 127.0.0.1 es común a todas las
//   cuentas y puede estar restringido).
// - Despliegue separado / desarrollo: se usa API_URL.
import http from 'node:http';
import https from 'node:https';

export type ApiStatus = { state: string; error: string | null; since: string; attempts: number; transport?: string };
type EmbeddedTarget = { socketPath?: string; host?: string; port?: number };

export const embeddedStatus = () => (globalThis as any).__EH_API_STATUS as ApiStatus | undefined;
const embeddedTarget = () => (globalThis as any).__EH_API_TARGET as EmbeddedTarget | undefined;

/** true si se puede consultar la API (en modo integrado, solo cuando está lista). */
export function apiReady() {
  const s = embeddedStatus();
  return !s || (s.state === 'lista' && !!embeddedTarget());
}

export type ApiResponse = { status: number; headers: http.IncomingHttpHeaders; body: Buffer };

/**
 * Llama a la API. `path` es relativo a /api/v1 e incluye la query (p. ej. "properties?take=12").
 */
export function callApi(path: string, init: { method?: string; headers?: Record<string, string>; body?: Buffer; timeoutMs?: number } = {}): Promise<ApiResponse> {
  const method = init.method || 'GET';
  const headers: Record<string, string> = { ...(init.headers || {}) };
  if (init.body) headers['content-length'] = String(init.body.length);
  const relative = path.replace(/^\/+/, '');

  let options: http.RequestOptions;
  let client: typeof http | typeof https = http;
  const target = embeddedTarget();
  if (embeddedStatus()) {
    if (!target) return Promise.reject(new Error('API integrada sin dirección'));
    options = target.socketPath
      ? { socketPath: target.socketPath, path: `/api/v1/${relative}` }
      : { host: target.host, port: target.port, path: `/api/v1/${relative}` };
    headers.host = 'localhost';
  } else {
    const base = new URL((process.env.API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/+$/, '') + '/');
    const url = new URL(relative, base);
    client = url.protocol === 'https:' ? https : http;
    options = { protocol: url.protocol, hostname: url.hostname, port: url.port || undefined, path: url.pathname + url.search };
  }

  return new Promise((resolve, reject) => {
    const req = client.request({ ...options, method, headers }, (res) => {
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode || 502, headers: res.headers, body: Buffer.concat(chunks) }));
      res.on('error', reject);
    });
    req.setTimeout(init.timeoutMs ?? 20000, () => req.destroy(new Error('Tiempo de espera agotado con la API')));
    req.on('error', reject);
    if (init.body) req.write(init.body);
    req.end();
  });
}

/** GET que devuelve JSON o null si falla. */
export async function getJson<T>(path: string): Promise<{ status: number; data: T | null }> {
  if (!apiReady()) return { status: 503, data: null };
  try {
    const r = await callApi(path, { headers: { accept: 'application/json' } });
    if (r.status < 200 || r.status >= 300) return { status: r.status, data: null };
    return { status: r.status, data: JSON.parse(r.body.toString('utf8')) as T };
  } catch {
    return { status: 502, data: null };
  }
}
