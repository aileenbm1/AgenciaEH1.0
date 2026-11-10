"use client";
import dynamic from 'next/dynamic';
import type { MapPoint } from './osm-map';
const OsmMap = dynamic(() => import('./osm-map'), { ssr: false, loading: () => <div className="osm-map" style={{ height: 520 }} /> });

/** Vista de mapa del catálogo (RF mapa): propiedades con ubicación; las aproximadas como zona. */
export default function CatalogMap({ points, total }: { points: MapPoint[]; total: number }) {
  return <section className="catalog-map">
    <OsmMap points={points} height={520} />
    <p className="muted">{points.length} de {total} propiedad(es) tienen ubicación en el mapa. Los círculos indican una zona aproximada.</p>
  </section>;
}
