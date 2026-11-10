"use client";
import { FormEvent, useState } from 'react';
import dynamic from 'next/dynamic';
const OsmMap = dynamic(() => import('./osm-map'), { ssr: false, loading: () => <div className="osm-map" style={{ height: 300 }} /> });

type Value = { latitude: number | null; longitude: number | null; showExactLocation: boolean };

/** Elegir la ubicación de la propiedad: búsqueda por dirección (Nominatim, gratis) o clic en el mapa. */
export default function LocationPicker({ value, onChange, hint }: { value: Value; onChange: (v: Value) => void; hint: string }) {
  const [q, setQ] = useState(''); const [busy, setBusy] = useState(false); const [msg, setMsg] = useState('');
  const [results, setResults] = useState<{ display_name: string; lat: string; lon: string }[]>([]);
  async function search(e?: FormEvent) {
    e?.preventDefault(); const term = (q || hint).trim(); if (term.length < 3) return;
    setBusy(true); setMsg(''); setResults([]);
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=mx&accept-language=es&q=${encodeURIComponent(term)}`);
      const d = await r.json();
      if (!d.length) setMsg('No se encontró. Prueba con calle y colonia, o haz clic en el mapa.');
      setResults(d);
    } catch { setMsg('No se pudo buscar ahora. Haz clic en el mapa para marcar la ubicación.'); } finally { setBusy(false); }
  }
  const set = (lat: number, lng: number) => { onChange({ ...value, latitude: lat, longitude: lng }); setResults([]); };
  const has = value.latitude != null && value.longitude != null;
  return <fieldset className="location-picker">
    <legend>Ubicación en el mapa (opcional)</legend>
    <div className="loc-search">
      <input value={q} onChange={e => setQ(e.target.value)} placeholder={hint || 'Calle, colonia, ciudad'} aria-label="Buscar dirección" onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); search(); } }} />
      <button type="button" className="button button-outline" onClick={() => search()} disabled={busy}>{busy ? 'Buscando…' : 'Buscar'}</button>
    </div>
    {results.length > 0 && <ul className="loc-results">{results.map(r => <li key={r.lat + r.lon}><button type="button" className="inline-link" onClick={() => set(Number(Number(r.lat).toFixed(6)), Number(Number(r.lon).toFixed(6)))}>{r.display_name}</button></li>)}</ul>}
    {msg && <p className="muted">{msg}</p>}
    <OsmMap height={300} onPick={set} points={has ? [{ lat: value.latitude!, lng: value.longitude!, title: 'Ubicación de la propiedad', approx: !value.showExactLocation }] : []} />
    <small className="muted">Haz clic en el mapa para ajustar el punto. {has ? `(${value.latitude}, ${value.longitude})` : ''}</small>
    <div className="loc-actions">
      <label className="check"><input type="checkbox" checked={value.showExactLocation} onChange={e => onChange({ ...value, showExactLocation: e.target.checked })} /> Mostrar la ubicación exacta al público (si no, se muestra una zona aproximada de ~1 km)</label>
      {has && <button type="button" className="inline-link" onClick={() => onChange({ latitude: null, longitude: null, showExactLocation: value.showExactLocation })}>Quitar ubicación</button>}
    </div>
  </fieldset>;
}
