// Proxy del sitio hacia la API NestJS.
// El navegador siempre llama a /api/v1/... en el mismo dominio del frontend y
// este handler reenvía la petición a la API (integrada en el mismo proceso o en
// API_URL). Así el mismo compilado sirve en cualquier dominio, sin CORS y con la
// cookie de sesión en el dominio del sitio.
import { NextRequest } from 'next/server';
import { ApiStatus, apiReady, callApi, embeddedStatus } from '@/lib/api-transport';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FORWARD_REQUEST_HEADERS = ['authorization', 'content-type', 'cookie', 'accept', 'accept-language', 'user-agent', 'x-forwarded-for'];
const FORWARD_RESPONSE_HEADERS = ['content-type', 'cache-control', 'location'];

function unavailable(status?: ApiStatus, detail?: string) {
  return Response.json(
    { statusCode: 502, message: 'La API no está disponible en este momento.', ...(status ? { api: status } : {}), ...(detail ? { detalle: detail } : {}) },
    { status: 502 },
  );
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  // Paquete de un solo sitio: mientras la API interna no esté lista no se reenvía
  // nada (ni contraseñas) a ninguna dirección.
  if (!apiReady()) return unavailable(embeddedStatus());

  const { path } = await ctx.params;
  const relative = `${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers[name] = value;
  }
  const hasBody = !['GET', 'HEAD'].includes(req.method);

  let upstream;
  try {
    upstream = await callApi(relative, {
      method: req.method,
      headers,
      body: hasBody ? Buffer.from(await req.arrayBuffer()) : undefined,
    });
  } catch (err: any) {
    const detail = [err?.code, err?.message].filter(Boolean).join(': ');
    console.error('[Agencia EH] Proxy /api/v1 →', detail);
    return unavailable(embeddedStatus(), detail);
  }

  const out = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers[name];
    if (typeof value === 'string') out.set(name, value);
  }
  const cookies = upstream.headers['set-cookie'];
  for (const cookie of Array.isArray(cookies) ? cookies : cookies ? [cookies] : []) out.append('set-cookie', cookie);

  return new Response(upstream.status === 204 || upstream.status === 304 ? null : new Uint8Array(upstream.body), { status: upstream.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
