"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authFetch, currentToken } from '@/lib/auth';

export const COMPARE_KEY = 'eh_compare';
export const MAX_COMPARE = 4;
export function readCompare(): string[] { try { return JSON.parse(localStorage.getItem(COMPARE_KEY) || '[]'); } catch { return []; } }
export function writeCompare(list: string[]) { try { localStorage.setItem(COMPARE_KEY, JSON.stringify(list.slice(0, MAX_COMPARE))); } catch { /* sin almacenamiento */ } }

/** Botones de la ficha: guardar en favoritos y agregar a comparar. */
export default function PropertyTools({ propertyId, slug }: { propertyId: string; slug: string }) {
  const [fav, setFav] = useState<boolean | null>(null);
  const [logged, setLogged] = useState(false);
  const [inCompare, setInCompare] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    setInCompare(readCompare().includes(slug));
    if (!currentToken()) { setFav(false); return; }
    setLogged(true);
    authFetch('/favorites/ids').then(r => r.ok ? r.json() : []).then((ids: string[]) => setFav(ids.includes(propertyId))).catch(() => setFav(false));
  }, [propertyId, slug]);

  async function toggleFav() {
    const next = !fav; setFav(next);
    const r = await authFetch(`/favorites/${propertyId}`, { method: next ? 'POST' : 'DELETE' });
    if (!r.ok) { setFav(!next); setMsg('No se pudo actualizar favoritos.'); } else setMsg(next ? 'Guardada en tus favoritos.' : 'Quitada de favoritos.');
  }
  function toggleCompare() {
    const list = readCompare();
    if (list.includes(slug)) { writeCompare(list.filter(s => s !== slug)); setInCompare(false); setMsg('Quitada de comparar.'); return; }
    if (list.length >= MAX_COMPARE) { setMsg(`Puedes comparar hasta ${MAX_COMPARE} propiedades. Quita alguna en Comparar.`); return; }
    writeCompare([...list, slug]); setInCompare(true); setMsg('Agregada a comparar.');
  }

  const here = typeof window !== 'undefined' ? window.location.pathname : '/propiedades';
  return <div className="property-tools">
    {logged ? <button type="button" className={`button button-outline${fav ? ' is-on' : ''}`} onClick={toggleFav} disabled={fav === null} aria-pressed={!!fav}>{fav ? '♥ En favoritos' : '♡ Guardar en favoritos'}</button>
      : <Link className="button button-outline" href={`/acceso?next=${encodeURIComponent(here)}`}>♡ Inicia sesión para guardar</Link>}
    <button type="button" className={`button button-outline${inCompare ? ' is-on' : ''}`} onClick={toggleCompare} aria-pressed={inCompare}>{inCompare ? '✓ En comparar' : '+ Comparar'}</button>
    {inCompare && <Link className="small-link" href="/comparar">Ver comparación →</Link>}
    {msg && <small className="muted" role="status">{msg}</small>}
  </div>;
}

/** En el catálogo: guarda los filtros actuales como búsqueda con aviso por correo. */
export function SaveSearchButton({ query }: { query: Record<string, string> }) {
  const [logged, setLogged] = useState(false); const [state, setState] = useState<'idle' | 'form' | 'busy' | 'done'>('idle');
  const [name, setName] = useState(''); const [error, setError] = useState('');
  useEffect(() => { setLogged(!!currentToken()); }, []);
  const hasFilters = Object.keys(query).length > 0;
  if (!hasFilters) return null;
  if (!logged) return <Link className="button button-outline" href={`/acceso?next=${encodeURIComponent('/propiedades?' + new URLSearchParams(query))}`}>🔔 Inicia sesión para guardar esta búsqueda</Link>;
  if (state === 'done') return <span className="notice ok inline-notice">Búsqueda guardada. Te avisaremos por correo cuando se publique algo que coincida.</span>;
  if (state === 'idle') return <button type="button" className="button button-outline" onClick={() => { setName(Object.values(query).join(' · ').slice(0, 80)); setState('form'); }}>🔔 Guardar búsqueda y avisarme</button>;
  async function save() {
    setState('busy'); setError('');
    const r = await authFetch('/saved-searches', { method: 'POST', body: JSON.stringify({ name, query, alerts: true }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) setState('done'); else { setError(Array.isArray(d.message) ? d.message.join(' ') : d.message || 'No se pudo guardar.'); setState('form'); }
  }
  return <span className="save-search">
    <input value={name} onChange={e => setName(e.target.value)} maxLength={120} aria-label="Nombre de la búsqueda" placeholder="Nombre de la búsqueda" />
    <button type="button" className="button button-navy" disabled={state === 'busy' || name.trim().length < 2} onClick={save}>{state === 'busy' ? 'Guardando…' : 'Guardar'}</button>
    {error && <small className="auth-error">{error}</small>}
  </span>;
}
