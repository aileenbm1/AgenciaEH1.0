// Proxy del sitio hacia la API NestJS.
// El navegador siempre llama a /api/v1/... en el mismo dominio del frontend y
// este handler reenvía la petición a API_URL (variable leída en tiempo de
// ejecución). Así el mismo compilado sirve en cualquier dominio, sin CORS y con
// la cookie de sesión en el dominio del sitio.
import { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

const FORWARD_REQUEST_HEADERS = ['authorization', 'content-type', 'cookie', 'accept', 'accept-language', 'user-agent'];
const FORWARD_RESPONSE_HEADERS = ['content-type', 'cache-control', 'location'];

function apiBase() {
  return (process.env.API_URL || 'http://127.0.0.1:4000/api/v1').replace(/\/+$/, '');
}

async function proxy(req: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const target = `${apiBase()}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;

  const headers = new Headers();
  for (const name of FORWARD_REQUEST_HEADERS) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  const forwardedFor = req.headers.get('x-forwarded-for');
  if (forwardedFor) headers.set('x-forwarded-for', forwardedFor);

  const hasBody = !['GET', 'HEAD'].includes(req.method);
  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      body: hasBody ? await req.arrayBuffer() : undefined,
      redirect: 'manual',
      cache: 'no-store',
    });
  } catch {
    // En el paquete de un solo sitio, start.js publica aquí el estado de la API.
    const status = (globalThis as any).__EH_API_STATUS as { state: string; error: string | null; since: string; attempts: number } | undefined;
    return Response.json(
      { statusCode: 502, message: 'La API no está disponible en este momento.', ...(status ? { api: status } : {}) },
      { status: 502 },
    );
  }

  const out = new Headers();
  for (const name of FORWARD_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) out.set(name, value);
  }
  for (const cookie of upstream.headers.getSetCookie()) out.append('set-cookie', cookie);

  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
