"use client";
import { useEffect, useRef } from 'react';
import 'leaflet/dist/leaflet.css';
import type { Map as LMap, LayerGroup } from 'leaflet';

export type MapPoint = { lat: number; lng: number; title: string; href?: string; label?: string; approx?: boolean; image?: string | null };
const GTO: [number, number] = [21.019, -101.257]; // Guanajuato, centro por defecto
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));

/**
 * Mapa de OpenStreetMap (gratuito, sin clave) con Leaflet.
 * - points: marcadores; los aproximados se dibujan como un círculo (~700 m).
 * - onPick: si se pasa, un clic en el mapa elige la ubicación (formulario).
 */
export default function OsmMap({ points, onPick, height = 360, zoom }: { points: MapPoint[]; onPick?: (lat: number, lng: number) => void; height?: number; zoom?: number }) {
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<LMap | null>(null);
  const layer = useRef<LayerGroup | null>(null);
  const pick = useRef(onPick); pick.current = onPick;

  useEffect(() => {
    let alive = true;
    import('leaflet').then(L => {
      if (!alive || !box.current || map.current) return;
      const m = L.map(box.current, { scrollWheelZoom: false }).setView(GTO, 8);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; colaboradores de <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(m);
      m.on('click', e => pick.current?.(Number(e.latlng.lat.toFixed(6)), Number(e.latlng.lng.toFixed(6))));
      map.current = m; layer.current = L.layerGroup().addTo(m);
      draw(L);
    });
    return () => { alive = false; map.current?.remove(); map.current = null; };
  }, []);

  function draw(L: typeof import('leaflet')) {
    const m = map.current, g = layer.current; if (!m || !g) return;
    g.clearLayers();
    const bounds: [number, number][] = [];
    for (const p of points) {
      const html = `<b>${esc(p.title)}</b>${p.label ? `<br>${esc(p.label)}` : ''}${p.approx ? '<br><small>Ubicación aproximada</small>' : ''}${p.href ? `<br><a href="${esc(p.href)}">Ver propiedad →</a>` : ''}`;
      const shape = p.approx
        ? L.circle([p.lat, p.lng], { radius: 700, color: '#172536', weight: 1, fillColor: '#C5A46D', fillOpacity: 0.35 })
        : L.circleMarker([p.lat, p.lng], { radius: 9, color: '#fff', weight: 2, fillColor: '#172536', fillOpacity: 1 });
      shape.bindPopup(html).addTo(g);
      bounds.push([p.lat, p.lng]);
    }
    if (bounds.length === 1) m.setView(bounds[0], zoom || (points[0].approx ? 14 : 16));
    else if (bounds.length > 1) m.fitBounds(bounds, { padding: [30, 30], maxZoom: 15 });
  }
  useEffect(() => { import('leaflet').then(L => draw(L)); }, [points]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={box} className="osm-map" style={{ height }} role="region" aria-label="Mapa" />;
}
