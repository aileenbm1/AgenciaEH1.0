"use client";
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Printer, Share2, X } from 'lucide-react';
import { mxn } from '@/lib/data';
import { MAX_COMPARE, readCompare, writeCompare } from '@/components/property-tools';
import type { MapPoint } from '@/components/osm-map';

const OsmMap = dynamic(() => import('@/components/osm-map'), { ssr: false, loading: () => <div className="osm-map" style={{ height: 260 }} /> });

type P = {
  id: string; slug: string; title: string; operation: 'RENT' | 'SALE' | 'BOTH'; price: number | string; rentPrice?: number | string | null; category?: string | null; availability?: string;
  municipality: string; neighborhood?: string | null; propertyType: string; bedrooms?: number | null; bathrooms?: number | null; builtArea?: number | string | null; landArea?: number | string | null;
  images?: { url: string }[]; latitude?: number | string | null; longitude?: number | string | null; showExactLocation?: boolean;
  custom?: Record<string, string>; customFields?: { key: string; label: string; type: string }[]; priceMode?: string; priceSuffix?: string | null;
};
type Cell = { v: number | null; text: string; yes?: boolean | null };
type Row = { group: string; label: string; best?: 'min' | 'max'; bar?: boolean; cells: Cell[] };

const AV: Record<string, string> = { AVAILABLE: 'Disponible', RESERVED: 'Apartada', RENTED: 'Rentada', SOLD: 'Vendida' };
const OP: Record<string, string> = { RENT: 'Renta', SALE: 'Venta', BOTH: 'Venta y renta' };
const n = (x: unknown) => { const v = Number(x); return Number.isFinite(v) && v > 0 ? v : null; };
const short = (v: number) => v >= 1e6 ? `$${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2).replace(/\.?0+$/, '')}M` : mxn(v);
const salePrice = (p: P) => p.operation === 'RENT' || p.priceMode === 'HIDE' ? null : n(p.price);
const rentPrice = (p: P) => p.priceMode === 'HIDE' ? null : p.operation === 'RENT' ? n(p.price) : p.operation === 'BOTH' ? n(p.rentPrice) : null;
const area = (p: P) => n(p.builtArea) || n(p.landArea);

/** Índices de la(s) mejor(es) de un renglón (solo si hay al menos 2 valores y no todos son iguales). */
function bestOf(r: Row): number[] {
  if (!r.best) {
    const ys = r.cells.map(c => c.yes); if (ys.some(y => y === true) && ys.some(y => y === false)) return ys.flatMap((y, i) => y ? [i] : []);
    return [];
  }
  const vals = r.cells.map(c => c.v).filter((v): v is number => v !== null);
  if (vals.length < 2) return [];
  const b = r.best === 'min' ? Math.min(...vals) : Math.max(...vals);
  if (vals.every(v => v === b)) return [];
  return r.cells.flatMap((c, i) => c.v === b ? [i] : []);
}

function buildRows(items: P[]): Row[] {
  const rows: Row[] = [];
  const add = (group: string, label: string, get: (p: P) => Cell, extra: Partial<Row> = {}) => {
    const cells = items.map(get);
    if (cells.every(c => c.text === '—')) return;
    rows.push({ group, label, cells, ...extra });
  };
  add('PRECIO', 'Precio de venta', p => { const v = salePrice(p); return { v, text: p.priceMode === 'HIDE' && p.operation !== 'RENT' ? 'A consultar' : v ? `${p.priceMode === 'FROM' ? 'Desde ' : ''}${mxn(v)}${p.priceSuffix ? ' ' + p.priceSuffix : ''}` : '—' }; }, { best: 'min' });
  add('PRECIO', 'Renta mensual', p => { const v = rentPrice(p); return { v, text: p.priceMode === 'HIDE' && p.operation !== 'SALE' ? 'A consultar' : v ? `${mxn(v)} / mes` : '—' }; }, { best: 'min' });
  add('PRECIO', 'Precio por m²', p => { const s = salePrice(p), a = area(p); const v = s && a ? Math.round(s / a) : null; return { v, text: v ? mxn(v) : '—' }; }, { best: 'min', bar: true });
  add('PRECIO', 'Operación', p => ({ v: null, text: OP[p.operation] }));
  add('PRECIO', 'Disponibilidad', p => ({ v: null, text: AV[p.availability || 'AVAILABLE'] || 'Disponible' }));
  add('ESPACIOS', 'Construcción', p => { const v = n(p.builtArea); return { v, text: v ? `${v} m²` : '—' }; }, { best: 'max', bar: true });
  add('ESPACIOS', 'Terreno', p => { const v = n(p.landArea); return { v, text: v ? `${v} m²` : '—' }; }, { best: 'max', bar: true });
  add('ESPACIOS', 'Recámaras', p => { const v = n(p.bedrooms); return { v, text: v ? String(v) : '—' }; }, { best: 'max' });
  add('ESPACIOS', 'Baños', p => { const v = n(p.bathrooms); return { v, text: v ? String(v) : '—' }; }, { best: 'max' });
  add('ESPACIOS', 'Tipo', p => ({ v: null, text: p.propertyType || '—' }));
  add('ESPACIOS', 'Categoría', p => ({ v: null, text: p.category || '—' }));
  // Características: los campos que configuró el administrador y que tenga al menos una propiedad.
  const fields = new Map<string, { label: string; type: string }>();
  for (const p of items) for (const f of p.customFields || []) if (p.custom?.[f.key] && !fields.has(f.key)) fields.set(f.key, { label: f.label, type: f.type });
  for (const [key, f] of fields) add('CARACTERÍSTICAS', f.label, p => {
    const raw = p.custom?.[key];
    if (f.type === 'BOOLEAN') { const yes = raw === '1' ? true : raw === '0' ? false : !raw ? false : null; return { v: null, yes, text: yes ? 'Sí' : 'No' }; }
    if (f.type === 'NUMBER') { const v = n(raw); return { v, text: raw || '—' }; }
    return { v: null, text: raw || '—' };
  });
  add('UBICACIÓN', 'Zona', p => ({ v: null, text: `${p.neighborhood ? p.neighborhood + ', ' : ''}${p.municipality}` }));
  return rows;
}

/** Comparación de propiedades: resumen, solo diferencias, lo mejor en verde, mapa, compartir e imprimir. */
export default function Compare() {
  const [items, setItems] = useState<P[] | null>(null);
  const [onlyDiff, setOnlyDiff] = useState(true);
  const [sugs, setSugs] = useState<P[]>([]);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    try { if (localStorage.getItem('mc-cmp-all') === '1') setOnlyDiff(false); } catch { /* sin almacenamiento */ }
    // Un enlace compartido (?p=slug1,slug2) muestra esa comparación y la guarda en este navegador.
    const shared = new URLSearchParams(window.location.search).get('p');
    const slugs = shared ? shared.split(',').map(s => s.trim()).filter(s => /^[a-z0-9-]{1,140}$/.test(s)).slice(0, MAX_COMPARE) : readCompare();
    Promise.all(slugs.map(s => fetch(`/api/v1/properties/${encodeURIComponent(s)}`).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(list => { const ok = list.filter(Boolean) as P[]; writeCompare(ok.map(p => p.slug)); setItems(ok); });
  }, []);

  // Sugerencias parecidas para el lugar libre (misma operación que la primera).
  useEffect(() => {
    if (!items || items.length >= MAX_COMPARE) { setSugs([]); return; }
    const op = items[0]?.operation === 'RENT' ? 'RENT' : items[0] ? 'SALE' : '';
    fetch(`/api/v1/properties?take=8&sort=recent${op ? `&operation=${op}` : ''}`).then(r => r.json()).then(d => {
      const have = new Set(items.map(p => p.slug));
      setSugs(((d.items || []) as P[]).filter(p => !have.has(p.slug)).slice(0, 3));
    }).catch(() => setSugs([]));
  }, [items]);

  const rows = useMemo(() => items ? buildRows(items) : [], [items]);
  const save = (list: P[]) => { writeCompare(list.map(p => p.slug)); setItems(list); };
  const remove = (slug: string) => save((items || []).filter(p => p.slug !== slug));
  const addSug = async (slug: string) => {
    const r = await fetch(`/api/v1/properties/${encodeURIComponent(slug)}`); if (!r.ok) return;
    save([...(items || []), await r.json()].slice(0, MAX_COMPARE));
  };
  const toggleDiff = () => { const v = !onlyDiff; setOnlyDiff(v); try { localStorage.setItem('mc-cmp-all', v ? '0' : '1'); } catch { /* sin almacenamiento */ } };
  const share = async () => {
    const url = `${window.location.origin}/comparar?p=${(items || []).map(p => p.slug).join(',')}`;
    const text = `Mira esta comparación de ${items?.length} propiedades en Mi Casa`;
    try {
      if (navigator.share) { await navigator.share({ title: 'Comparación de propiedades', text, url }); return; }
      await navigator.clipboard.writeText(url); setMsg('Enlace copiado. Pégalo en WhatsApp, correo o donde quieras.');
    } catch { /* el usuario canceló */ }
  };

  if (items === null) return <main className="page-wrap"><p className="muted">Cargando…</p></main>;
  const head = <div className="page-heading cmp-heading"><div><span className="eyebrow">DECIDE CON CLARIDAD</span><h1>Compara propiedades</h1>
    {items.length === 0 && <p>Agrega propiedades con el botón <b>“+ Comparar”</b> en el catálogo o en cada ficha (hasta {MAX_COMPARE}) y revísalas lado a lado.</p>}</div>
    {items.length > 0 && <div className="cmp-tools">
      <label className="cmp-switch"><input type="checkbox" checked={onlyDiff} onChange={toggleDiff} /><i aria-hidden />Solo diferencias</label>
      <button type="button" className="button button-outline" onClick={share}><Share2 size={16} aria-hidden /> Compartir</button>
      <button type="button" className="button button-outline cmp-hide-m" onClick={() => window.print()}><Printer size={16} aria-hidden /> Imprimir / PDF</button>
    </div>}</div>;
  if (items.length === 0) return <main className="page-wrap">{head}
    <div className="empty-start">Aún no has agregado propiedades para comparar. <Link className="inline-link" href="/propiedades">Explora el catálogo</Link> y usa “+ Comparar” en las que te interesen.</div></main>;

  // Resumen: quién gana en lo más importante.
  const winner = (label: string) => { const r = rows.find(x => x.label === label); if (!r) return null; const b = bestOf(r); if (!b.length) return null; return b.length > 1 ? 'empate' : items[b[0]].title; };
  const summary = ([['Mejor precio', 'Precio de venta'], ['Renta más baja', 'Renta mensual'], ['Mejor precio por m²', 'Precio por m²'], ['Más construcción', 'Construcción'], ['Más recámaras', 'Recámaras']] as const)
    .map(([t, l]) => [t, winner(l)] as const).filter(([, w]) => w);
  const visible = rows.filter(r => !onlyDiff || items.length < 2 || new Set(r.cells.map(c => c.text)).size > 1);
  const hiddenCount = rows.length - visible.length;
  const groups = [...new Set(visible.map(r => r.group))];
  const points: MapPoint[] = items.flatMap((p, i) => n(p.latitude) && n(Math.abs(Number(p.longitude))) ? [{ lat: Number(p.latitude), lng: Number(p.longitude), title: `${i + 1} · ${p.title}`, label: p.municipality, href: `/propiedades/${p.slug}`, approx: !p.showExactLocation }] : []);
  const cols = items.length + (items.length < MAX_COMPARE ? 1 : 0);
  const cell = (r: Row, i: number, best: number[]) => {
    const c = r.cells[i], max = r.bar ? Math.max(...r.cells.map(x => x.v || 0)) : 0;
    return <div key={i} className={`cmp-v${best.includes(i) ? ' best' : ''}`}>
      {c.yes !== undefined ? (c.yes ? <span className="cmp-yes">✓ Sí</span> : <span className="cmp-no">✗ No</span>) : c.text}
      {best.includes(i) && <span className="cmp-star">★ mejor</span>}
      {r.bar && c.v && max ? <span className="cmp-bar" aria-hidden><i style={{ width: `${Math.round((c.v / max) * 100)}%` }} /></span> : null}
    </div>;
  };

  return <main className="page-wrap cmp-page">
    {head}
    {msg && <p className="notice ok" role="status">{msg}</p>}
    {summary.length > 0 && <div className="cmp-sum"><span aria-hidden>🏆</span>{summary.map(([t, w]) => <span key={t}>{t}: <b>{w}</b></span>)}</div>}

    {/* Computadora: tabla por secciones */}
    <div className="cmp-grid cmp-desk" style={{ gridTemplateColumns: `180px repeat(${cols}, minmax(0, 1fr))` }}>
      <div className="cmp-corner">{items.length} de {MAX_COMPARE} lugares{hiddenCount > 0 && <small>{hiddenCount} dato{hiddenCount === 1 ? '' : 's'} igual{hiddenCount === 1 ? '' : 'es'} oculto{hiddenCount === 1 ? '' : 's'}</small>}</div>
      {items.map((p, i) => <div key={p.slug} className="cmp-hc">
        <Link href={`/propiedades/${p.slug}`} className="cmp-img" style={{ backgroundImage: `url(${p.images?.[0]?.url || '/placeholder-property.svg'})` }}><span className="cmp-num">{i + 1}</span></Link>
        <button type="button" className="cmp-x" onClick={() => remove(p.slug)} aria-label={`Quitar ${p.title}`} title="Quitar"><X size={14} /></button>
        <Link href={`/propiedades/${p.slug}`} className="cmp-title">{p.title}</Link>
        <small className="muted">{p.neighborhood ? `${p.neighborhood}, ` : ''}{p.municipality}</small>
        <div className="cmp-price">{p.priceMode === 'HIDE' ? 'Precio a consultar' : salePrice(p) ? `${p.priceMode === 'FROM' ? 'Desde ' : ''}${mxn(salePrice(p)!)}${p.priceSuffix ? ' ' + p.priceSuffix : ''}` : `${mxn(rentPrice(p) || 0)} / mes`}</div>
        <div className="cmp-acts"><Link className="button button-outline" href={`/propiedades/${p.slug}`}>Ver ficha</Link><Link className="button button-navy" href={`/propiedades/${p.slug}#contacto`}>Me interesa</Link></div>
      </div>)}
      {items.length < MAX_COMPARE && <div className="cmp-hc"><div className="cmp-add"><span aria-hidden>＋</span><b>Agrega otra</b>
        {sugs.length ? <><small>o elige una parecida:</small>{sugs.map(s => <button key={s.slug} type="button" onClick={() => addSug(s.slug)}>{s.title.length > 30 ? s.title.slice(0, 29) + '…' : s.title} · {short(salePrice(s) || rentPrice(s) || 0)}</button>)}</> : <Link className="inline-link" href="/propiedades">Ir al catálogo</Link>}</div></div>}
      {groups.map(g => <div key={g} className="cmp-group" style={{ display: 'contents' }}>
        <div className="cmp-sec" style={{ gridColumn: '1 / -1' }}>{g}</div>
        {visible.filter(r => r.group === g).map(r => { const best = bestOf(r); return <div key={r.label} style={{ display: 'contents' }}>
          <div className="cmp-lb">{r.label}</div>{items.map((_, i) => cell(r, i, best))}{items.length < MAX_COMPARE && <div className="cmp-e" />}
        </div>; })}
      </div>)}
      {points.length > 0 && <><div className="cmp-sec" style={{ gridColumn: '1 / -1' }}>MAPA</div><div className="cmp-lb">Dónde están</div>
        <div className="cmp-map" style={{ gridColumn: `2 / span ${cols}` }}><OsmMap points={points} height={260} /></div></>}
    </div>

    {/* Celular: fotos fijas arriba y una tarjeta por dato */}
    <div className="cmp-mob">
      <div className="cmp-mob-top" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>{items.map((p, i) => <div key={p.slug}>
        <Link href={`/propiedades/${p.slug}`} className="cmp-img" style={{ backgroundImage: `url(${p.images?.[0]?.url || '/placeholder-property.svg'})` }}><span className="cmp-num">{i + 1}</span></Link>
        <button type="button" className="cmp-x" onClick={() => remove(p.slug)} aria-label={`Quitar ${p.title}`}><X size={12} /></button><b>{p.title}</b></div>)}</div>
      {visible.map(r => { const best = bestOf(r); return <div key={r.label} className="cmp-mrow"><div className="cmp-ml">{r.label}</div>
        <div className="cmp-mvals" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>{items.map((_, i) => { const c = r.cells[i];
          return <span key={i} className={best.includes(i) ? 'best' : ''}>{c.yes !== undefined ? (c.yes ? '✓' : '✗') : r.label.startsWith('Precio') && c.v ? short(c.v) : c.text}</span>; })}</div></div>; })}
      {points.length > 0 && <div className="cmp-mrow"><div className="cmp-ml">Dónde están</div><OsmMap points={points} height={220} /></div>}
      {items.length < MAX_COMPARE && sugs.length > 0 && <div className="cmp-mrow"><div className="cmp-ml">Agrega otra parecida</div><div className="cmp-mob-sugs">{sugs.map(s => <button key={s.slug} type="button" onClick={() => addSug(s.slug)}>+ {s.title}</button>)}</div></div>}
      <div className="cmp-mob-acts"><button type="button" className="button button-outline" onClick={share}><Share2 size={16} aria-hidden /> Compartir</button>
        <Link className="button button-navy" href={`/propiedades/${items[0].slug}#contacto`}>Me interesa…</Link></div>
    </div>
  </main>;
}
