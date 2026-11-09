// En el navegador se usa el proxy del propio sitio (/api/v1), que reenvía a la API.
const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api/v1';
const TOKEN_KEY = 'eh_access_token';
/** Evento que avisa al encabezado y paneles que la sesión cambió (login/logout). */
export const SESSION_EVENT = 'eh:session';

export type UserRole = 'BUYER' | 'AGENT' | 'AGENCY' | 'ADMIN';
export type SessionUser = { id: string; fullName: string; email: string; role: UserRole; phone?: string | null; emailVerified?: boolean };
type AuthResponse = { accessToken: string; user: SessionUser };

function readToken() { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } }
function writeToken(token: string | null) {
  try { token ? sessionStorage.setItem(TOKEN_KEY, token) : sessionStorage.removeItem(TOKEN_KEY); } catch { /* sin almacenamiento */ }
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(SESSION_EVENT));
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
  writeToken(d.accessToken);
  return d;
}

async function refreshToken(): Promise<string | null> {
  try { const d = await apiAuth('refresh'); writeToken(d.accessToken); return d.accessToken; }
  catch { writeToken(null); return null; }
}

/** fetch autenticado: agrega el token y lo renueva una vez si expiró. */
export async function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  let token = readToken() || await refreshToken();
  const run = (t: string | null) => fetch(`${API_URL}${path}`, {
    ...init, credentials: 'include',
    headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers || {}), ...(t ? { Authorization: `Bearer ${t}` } : {}) },
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

export const roleHome: Record<UserRole, string> = { BUYER: '/panel/comprador', AGENT: '/panel/agente', AGENCY: '/panel/agencia', ADMIN: '/panel/admin' };
