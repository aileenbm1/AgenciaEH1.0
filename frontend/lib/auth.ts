// En el navegador se usa el proxy del propio sitio (/api/v1), que reenvía a la API.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const TOKEN_KEY = 'eh_access_token';
/** Evento que avisa al encabezado y paneles que la sesión cambió (login/logout). */
export const SESSION_EVENT = 'eh:session';

export type UserRole = 'BUYER' | 'AGENT' | 'AGENCY' | 'DEVELOPER' | 'ADMIN';
export type SessionUser = { id: string; fullName: string; email: string; role: UserRole; phone?: string | null; emailVerified?: boolean; approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED' };
type AuthResponse = { accessToken: string; user: SessionUser };

/** Token actual si hay sesión iniciada en esta pestaña (sin intentar renovarla). */
export function currentToken() { return readToken(); }
function readToken() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } }
function writeToken(token: string | null) {
  const before = readToken();
  try { token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
  // Solo se avisa si la sesión realmente cambió (evita ciclos de "sin sesión" → renovar → "sin sesión").
  if (typeof window !== 'undefined' && !!before !== !!token) window.dispatchEvent(new Event(SESSION_EVENT));
}

function errorMessage(d: any, fallback: string) {
  return Array.isArray(d?.message) ? d.message.join(' ') : d?.message || fallback;
}

export async function apiAuth(path: string, payload: Record<string, string> = {}) {
  const r = await fetch(`${API_URL}/auth/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(payload) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(errorMessage(d, 'No fue posible completar la solicitud.'));
  return d;
}

export async function authenticate(path: 'login' | 'register', payload: Record<string, string>): Promise<AuthResponse> {
  const d = await apiAuth(path, payload);
  noSessionUntil = 0;
  writeToken(d.accessToken);
  return d;
}

// Una sola renovación a la vez: el servidor rota el refresh token, así que dos
// renovaciones simultáneas invalidarían la sesión. Si no hay sesión, se recuerda
// unos segundos para no repetir la consulta en cada componente.
let refreshing: Promise<string | null> | null = null;
let noSessionUntil = 0;
async function refreshToken(): Promise<string | null> {
  if (Date.now() < noSessionUntil) return null;
  if (!refreshing) refreshing = (async () => {
    try { const d = await apiAuth('refresh'); writeToken(d.accessToken); return d.accessToken as string; }
    catch { noSessionUntil = Date.now() + 10000; writeToken(null); return null; }
    finally { setTimeout(() => { refreshing = null; }, 0); }
  })();
  return refreshing;
}

/** fetch autenticado: agrega el token y lo renueva una vez si expiró. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = readToken() || await refreshToken();
  const run = (t: string | null) => fetch(`${API_URL}${path}`, {
    ...init, credentials: 'include',
    // JSON solo cuando el cuerpo es texto; con FormData el navegador pone el multipart.
    headers: { ...(typeof init.body === 'string' ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
  });
  let r = await run(token);
  if (r.status === 401) { token = await refreshToken(); if (token) r = await run(token); }
  return r;
}

/** Igual que authFetch pero devuelve JSON o lanza un Error con el mensaje de la API. */
export async function authJson<T = any>(path: string, init: RequestInit = {}): Promise<T> {
  const r = await authFetch(path, init);
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(errorMessage(d, 'No fue posible completar la acción.'));
  return d as T;
}

/** Sube una foto y devuelve su URL pública. */
export async function uploadImage(file: Blob, name = 'foto.jpg'): Promise<string> {
  const body = new FormData();
  body.append('file', file, name.replace(/\.[^.]+$/, '') + (file.type === 'image/jpeg' ? '.jpg' : ''));
  const d = await authJson<{ url: string }>('/uploads/images', { method: 'POST', body });
  return d.url;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  if (typeof window === 'undefined') return null;
  if (!readToken() && !(await refreshToken())) return null;
  const r = await authFetch('/auth/me');
  return r.ok ? r.json() : null;
}

export async function updateProfile(payload: { fullName?: string; phone?: string }) {
  return authJson<SessionUser>('/auth/profile', { method: 'PATCH', body: JSON.stringify(payload) });
}

export async function signOut() {
  try { await authFetch('/auth/logout', { method: 'POST' }); } catch { /* la sesión local se limpia igual */ }
  writeToken(null);
}

export const roleHome: Record<UserRole, string> = { BUYER: '/panel/comprador', AGENT: '/panel/agente', AGENCY: '/panel/agencia', DEVELOPER: '/panel/desarrollador', ADMIN: '/panel/admin' };
