"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { mxn } from '@/lib/data';
import { readCompare, writeCompare } from '@/components/property-tools';

type P = { id: string; slug: string; title: string; operation: 'RENT' | 'SALE'; price: number | string; municipality: string; neighborhood?: string | null; propertyType: string;
  bedrooms?: number | null; bathrooms?: number | null; builtArea?: number | string | null; landArea?: number | string | null; images?: { url: string }[] };

/** Comparación de propiedades reales elegidas con "+ Comparar" en cada ficha (se guardan en este navegador). */
export default function Compare() {
  const [items, setItems] = useState<P[] | null>(null);
  useEffect(() => {
    const slugs = readCompare();
    Promise.all(slugs.map(s => fetch(`/api/v1/properties/${encodeURIComponent(s)}`).then(r => r.ok ? r.json() : null).catch(() => null)))
      .then(list => { const ok = list.filter(Boolean) as P[]; writeCompare(ok.map(p => p.slug)); setItems(ok); });
  }, []);
  const remove = (slug: string) => { const next = (items || []).filter(p => p.slug !== slug); writeCompare(next.map(p => p.slug)); setItems(next); };
  const rows: [string, (p: P) => string][] = [
    ['Precio', p => `${mxn(Number(p.price))}${p.operation === 'RENT' ? ' / mes' : ''}`],
    ['Operación', p => p.operation === 'RENT' ? 'Renta' : 'Venta'],
    ['Tipo', p => p.propertyType],
    ['Ubicación', p => `${p.neighborhood ? p.neighborhood + ', ' : ''}${p.municipality}`],
    ['Recámaras', p => String(p.bedrooms ?? '—')],
    ['Baños', p => String(p.bathrooms ?? '—')],
    ['Construcción', p => p.builtArea ? `${Number(p.builtArea)} m²` : '—'],
    ['Terreno', p => p.landArea ? `${Number(p.landArea)} m²` : '—'],
    ['Precio por m²', p => { const a = Number(p.builtArea || p.landArea || 0); return a ? mxn(Number(p.price) / a) : '—'; }],
  ];
  return <main className="page-wrap">
    <div className="page-heading"><span className="eyebrow">DECIDE CON CLARIDAD</span><h1>Compara propiedades</h1>
      <p>Agrega propiedades con el botón <b>"+ Comparar"</b> en cada ficha (hasta 4) y revísalas lado a lado.</p></div>
    {items === null ? <p className="muted">Cargando…</p> : items.length === 0
      ? <div className="empty-start">Aún no has agregado propiedades para comparar. <Link className="inline-link" href="/propiedades">Explora el catálogo</Link> y usa "+ Comparar" en las que te interesen.</div>
      : <div className="table-wrap"><table className="admin-table compare-table">
        <thead><tr><th />{items.map(p => <th key={p.slug}>
          <Link href={`/propiedades/${p.slug}`} className="compare-head"><span style={{ backgroundImage: `url(${p.images?.[0]?.url || '/placeholder-property.svg'})` }} /><b>{p.title}</b></Link>
          <button type="button" className="inline-link danger-link" onClick={() => remove(p.slug)}>Quitar</button></th>)}</tr></thead>
        <tbody>{rows.map(([label, fn]) => <tr key={label}><th scope="row">{label}</th>{items.map(p => <td key={p.slug}>{fn(p)}</td>)}</tr>)}</tbody>
      </table></div>}
  </main>;
}
