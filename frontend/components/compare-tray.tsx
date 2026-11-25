"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { X } from 'lucide-react';
import { COMPARE_EVENT, MAX_COMPARE, readCompare, writeCompare } from './property-tools';

type Mini = { slug: string; title: string; img: string | null };
const cache = new Map<string, Mini>();

/** Bandeja flotante: aparece al agregar propiedades para comparar y lleva a la comparación con un toque. */
export default function CompareTray() {
  const path = usePathname() || '';
  const [list, setList] = useState<Mini[]>([]);
  useEffect(() => {
    const sync = async () => {
      const slugs = readCompare();
      const out = await Promise.all(slugs.map(async s => {
        if (cache.has(s)) return cache.get(s)!;
        const r = await fetch(`/api/v1/properties/${encodeURIComponent(s)}`).catch(() => null); const d = r && r.ok ? await r.json() : null;
        const m = { slug: s, title: d?.title || s, img: d?.images?.[0]?.url || null }; cache.set(s, m); return m;
      }));
      setList(out);
    };
    sync(); window.addEventListener(COMPARE_EVENT, sync); window.addEventListener('storage', sync);
    return () => { window.removeEventListener(COMPARE_EVENT, sync); window.removeEventListener('storage', sync); };
  }, []);
  if (!list.length || !/^\/propiedades(\/|$)/.test(path) || path.endsWith('/fanpage')) return null;
  return <div className="cmp-tray" role="region" aria-label="Propiedades para comparar">
    <span className="cmp-tray-t">Comparar <b>{list.length}</b> de {MAX_COMPARE}</span>
    <div className="cmp-tray-imgs">{list.map(m => <button key={m.slug} type="button" title={`Quitar ${m.title}`} aria-label={`Quitar ${m.title}`} onClick={() => writeCompare(readCompare().filter(s => s !== m.slug))} style={m.img ? { backgroundImage: `url(${m.img})` } : undefined}><X size={12} /></button>)}
      {Array.from({ length: MAX_COMPARE - list.length }, (_, i) => <span key={i} className="slot" aria-hidden>＋</span>)}</div>
    {list.length >= 2 ? <Link className="cmp-tray-go" href="/comparar">Comparar ahora →</Link> : <span className="cmp-tray-hint">Agrega otra para comparar</span>}
    <button type="button" className="cmp-tray-x" onClick={() => writeCompare([])} aria-label="Vaciar la comparación" title="Vaciar"><X size={16} /></button>
  </div>;
}
