"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, X } from 'lucide-react';
import { authJson } from '@/lib/auth';
import { mxn } from '@/lib/data';

type W = { propertyId: string; title: string; slug: string; cover: string | null; municipality: string; operation: string; price: number; prevPrice: number | null;
  availability: string; availableFrom: string | null; notice: string | null; unseen: boolean; source: string };
const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const today = () => new Date().toISOString().slice(0, 10);

function state(w: W): { label: string; tone: 'ok' | 'soon' | 'wait'; text: string } {
  const per = w.operation === 'RENT' ? ' / mes' : '';
  if (w.notice === 'price' && w.prevPrice) return { label: 'Bajó de precio', tone: 'ok', text: `Antes ${mxn(w.prevPrice)}, ahora ${mxn(w.price)}${per}` };
  const free = w.availability === 'AVAILABLE' && (!w.availableFrom || w.availableFrom <= today());
  if (free) return { label: '¡Disponible!', tone: 'ok', text: `${mxn(w.price)}${per} · ${w.municipality}` };
  if (w.availableFrom && w.availableFrom > today()) {
    const d = Math.round((Date.parse(w.availableFrom) - Date.parse(today())) / 86400000);
    return { label: d <= 7 ? 'Pronto' : 'Esperando', tone: d <= 7 ? 'soon' : 'wait', text: `Se libera en ${d} día${d === 1 ? '' : 's'} (${day(w.availableFrom)})` };
  }
  return { label: 'Esperando', tone: 'wait', text: w.availability === 'RESERVED' ? 'Apartada · te avisamos si se libera' : w.availability === 'SOLD' ? 'Vendida · te avisamos si vuelve a estar disponible' : 'Rentada · te avisamos cuando se libere' };
}

/** “Mis avisos” del comprador: en qué va cada propiedad que espera. */
export default function MyWatches() {
  const [list, setList] = useState<W[] | null>(null);
  useEffect(() => {
    authJson<W[]>('/watches').then(l => { setList(l); if (l.some(w => w.unseen)) authJson('/watches/seen', { method: 'POST' }).catch(() => {}); }).catch(() => setList([]));
  }, []);
  const remove = async (id: string) => { await authJson(`/watches/${id}`, { method: 'DELETE' }).catch(() => {}); setList(l => (l || []).filter(w => w.propertyId !== id)); };
  if (!list) return null;
  return <section className="adm-sec" id="avisos"><div className="adm-sec-h"><h2><BellRing size={20} aria-hidden /> Mis avisos</h2></div>
    <div className="adm-card my-watches">
      {list.length === 0 ? <p className="muted adm-pad">Cuando una propiedad que te guste esté rentada, apartada o vendida, usa <b>“Avísame cuando esté disponible”</b> en su ficha. Tus favoritas se agregan aquí solas si dejan de estar disponibles.</p>
        : list.map(w => { const s = state(w); return <div key={w.propertyId} className={`mw-row${w.unseen ? ' new' : ''}`}>
          {w.cover ? <img src={w.cover} alt="" /> : <span className="img-missing">Sin foto</span>}
          <div><Link href={`/propiedades/${w.slug}`}><b>{w.title}</b></Link><small>{s.text}{w.source === 'favorite' ? ' · desde tus favoritos' : ''}</small></div>
          <span className={`mw-pill ${s.tone}`}>{w.unseen ? '¡Nuevo! ' : ''}{s.label}</span>
          <button type="button" className="mw-x" onClick={() => remove(w.propertyId)} aria-label={`Quitar aviso de ${w.title}`} title="Quitar aviso"><X size={15} /></button>
        </div>; })}
    </div></section>;
}
