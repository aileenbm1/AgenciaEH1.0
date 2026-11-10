"use client";
import dynamic from 'next/dynamic';
const OsmMap = dynamic(() => import('./osm-map'), { ssr: false, loading: () => <div className="osm-map" style={{ height: 320 }} /> });

/** Mapa de una sola propiedad (ficha y fanpage). */
export default function PropertyMap({ lat, lng, title, exact, height = 320 }: { lat: number; lng: number; title: string; exact: boolean; height?: number }) {
  return <div>
    <OsmMap height={height} points={[{ lat, lng, title, approx: !exact }]} />
    <small className="muted">{exact ? 'Ubicación exacta.' : 'Zona aproximada: la dirección exacta te la comparte el asesor.'} <a className="inline-link" target="_blank" rel="noopener noreferrer" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${exact ? 17 : 14}/${lat}/${lng}`}>Abrir mapa grande</a></small>
  </div>;
}
