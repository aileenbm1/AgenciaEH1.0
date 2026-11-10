"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { authJson } from '@/lib/auth';
import { mxn } from '@/lib/data';

type Fav = { id: string; slug: string; title: string; operation: 'RENT' | 'SALE'; price: number | string; municipality: string; neighborhood?: string | null; available: boolean; images: { url: string }[] };
type Search = { id: string; name: string; query: Record<string, string>; alerts: boolean; lastNotifiedAt?: string | null };
type Sent = { id: string; kind: 'MESSAGE' | 'VISIT'; status: string; visitAt?: string | null; createdAt: string; property: { title: string; slug: string } | null; assignedTo: { fullName: string } | null };
const STATUS: Record<string, string> = { NEW: 'Enviada', CONTACTED: 'El asesor te contactó', VISIT_SCHEDULED: 'Visita confirmada', CLOSED: 'Cerrada', LOST: 'Cerrada' };
const LABELS: Record<string, string> = { operation: '', municipality: '', propertyType: '', minPrice: 'desde', maxPrice: 'hasta', bedrooms: 'recámaras', search: '', neighborhood: '' };
const describe = (q: Record<string, string>) => Object.entries(q).map(([k, v]) => k === 'operation' ? (v === 'RENT' ? 'Renta' : 'Venta') : k.endsWith('Price') ? `${LABELS[k]} ${mxn(Number(v))}` : k === 'bedrooms' ? `${v}+ ${LABELS[k]}` : v).join(' · ');
const fmt = (iso?: string | null) => iso ? new Date(iso).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '';

export default function BuyerSections() {
  const [favs, setFavs] = useState<Fav[] | null>(null);
  const [searches, setSearches] = useState<Search[] | null>(null);
  const [sent, setSent] = useState<Sent[] | null>(null);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    authJson<Fav[]>('/favorites').then(setFavs).catch(e => setError(e.message));
    authJson<Search[]>('/saved-searches').then(setSearches).catch(e => setError(e.message));
    authJson<Sent[]>('/leads/sent').then(setSent).catch(e => setError(e.message));
  }, []);
  useEffect(() => { load(); }, [load]);
  const unfav = async (id: string) => { await authJson(`/favorites/${id}`, { method: 'DELETE' }).catch(() => {}); setFavs(f => (f || []).filter(x => x.id !== id)); };
  const toggleAlert = async (s: Search) => { await authJson(`/saved-searches/${s.id}`, { method: 'PATCH', body: JSON.stringify({ alerts: !s.alerts }) }).catch(() => {}); setSearches(l => (l || []).map(x => x.id === s.id ? { ...x, alerts: !s.alerts } : x)); };
  const delSearch = async (id: string) => { await authJson(`/saved-searches/${id}`, { method: 'DELETE' }).catch(() => {}); setSearches(l => (l || []).filter(x => x.id !== id)); };

  return <>
    {error && <div className="notice" role="alert">{error}</div>}
    <section id="favoritos" className="admin-section">
      <h2 className="panel-subtitle">Mis favoritos {favs && <em className="count">{favs.length}</em>}</h2>
      {favs === null ? <p className="muted">Cargando…</p> : favs.length === 0 ? <div className="empty-start">Aún no tienes favoritos. En cada propiedad usa <b>"♡ Guardar en favoritos"</b>.</div>
        : <div className="fav-grid">{favs.map(p => <article key={p.id} className="dashboard-card fav-card">
          <Link href={`/propiedades/${p.slug}`} className="fav-img" style={{ backgroundImage: `url(${p.images[0]?.url || '/placeholder-property.svg'})` }} aria-label={p.title} />
          <div><h3><Link href={`/propiedades/${p.slug}`}>{p.title}</Link></h3><p className="meta">{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality}</p>
            <strong>{mxn(Number(p.price))}{p.operation === 'RENT' ? ' / mes' : ''}</strong>{!p.available && <p className="meta">Ya no está disponible</p>}
            <button type="button" className="inline-link danger-link" onClick={() => unfav(p.id)}>Quitar</button></div>
        </article>)}</div>}
    </section>
    <section id="busquedas" className="admin-section">
      <h2 className="panel-subtitle">Búsquedas guardadas {searches && <em className="count">{searches.length}</em>}</h2>
      <p className="muted lead">En el catálogo, aplica filtros y usa <b>"🔔 Guardar búsqueda y avisarme"</b>. Te enviamos un correo cuando se publique algo que coincida.</p>
      {searches === null ? <p className="muted">Cargando…</p> : searches.length === 0 ? <div className="empty-start">No tienes búsquedas guardadas. <Link className="inline-link" href="/propiedades">Ir al catálogo</Link>.</div>
        : <div className="table-wrap"><table className="admin-table">
          <thead><tr><th>Búsqueda</th><th>Avisos por correo</th><th /></tr></thead>
          <tbody>{searches.map(s => <tr key={s.id}>
            <td><b><Link href={`/propiedades?${new URLSearchParams(s.query)}`}>{s.name}</Link></b><small>{describe(s.query)}{s.lastNotifiedAt ? ` · último aviso ${fmt(s.lastNotifiedAt)}` : ''}</small></td>
            <td><label className="switch"><input type="checkbox" checked={s.alerts} onChange={() => toggleAlert(s)} /> {s.alerts ? 'Activados' : 'Desactivados'}</label></td>
            <td><button type="button" className="inline-link danger-link" onClick={() => delSearch(s.id)}>Borrar</button></td>
          </tr>)}</tbody></table></div>}
    </section>
    <section id="solicitudes" className="admin-section">
      <h2 className="panel-subtitle">Mis mensajes y visitas {sent && <em className="count">{sent.length}</em>}</h2>
      {sent === null ? <p className="muted">Cargando…</p> : sent.length === 0 ? <div className="empty-start">Cuando escribas a un asesor o pidas una visita desde una propiedad, aquí verás en qué va.</div>
        : <div className="table-wrap"><table className="admin-table">
          <thead><tr><th>Propiedad</th><th>Tipo</th><th>Estado</th></tr></thead>
          <tbody>{sent.map(l => <tr key={l.id}>
            <td>{l.property ? <Link href={`/propiedades/${l.property.slug}`}>{l.property.title}</Link> : 'Propiedad eliminada'}<small>{fmt(l.createdAt)}{l.assignedTo ? ` · ${l.assignedTo.fullName}` : ''}</small></td>
            <td>{l.kind === 'VISIT' ? <>Visita<small>{fmt(l.visitAt)}</small></> : 'Mensaje'}</td>
            <td><i className={`status-pill ${l.status === 'VISIT_SCHEDULED' ? 'ok' : l.status === 'NEW' ? 'warn' : 'neutral'}`}>{STATUS[l.status] || l.status}</i></td>
          </tr>)}</tbody></table></div>}
    </section>
  </>;
}
