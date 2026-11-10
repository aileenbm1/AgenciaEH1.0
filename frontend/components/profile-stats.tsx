"use client";
import { useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';

type Stats = { profileViews: number; team: number; properties: { total: number; active: number; rented: number; sold: number; review: number }; leads: { total: number; last30: number; visits: number; won: number }; reservations: { pending: number; open: number; completed: number }; fanpages: { views: number; shares: number; cta: number; leads: number } };

/** Estadísticas del perfil (agente: las suyas; agencia/desarrolladora: de todo el equipo). */
export default function ProfileStats({ team }: { team: boolean }) {
  const [s, setS] = useState<Stats | null>(null);
  useEffect(() => { authJson<Stats>('/agents/stats/me').then(setS).catch(() => {}); }, []);
  if (!s) return null;
  const tiles: [string, number, string][] = [
    ['Visitas al perfil', s.profileViews, 'Personas que abrieron tu perfil público'],
    ['Propiedades activas', s.properties.active, `${s.properties.review} en revisión · ${s.properties.total} en total`],
    ['Rentadas / vendidas', s.properties.rented + s.properties.sold, `${s.properties.rented} rentadas · ${s.properties.sold} vendidas`],
    ['Prospectos (30 días)', s.leads.last30, `${s.leads.total} en total · ${s.leads.visits} visitas · ${s.leads.won} cerrados`],
    ['Reservas por aprobar', s.reservations.pending, `${s.reservations.open} en curso · ${s.reservations.completed} cerradas`],
    ['Fanpages', s.fanpages.views, `visitas · ${s.fanpages.shares} compartidas · ${s.fanpages.cta} clics · ${s.fanpages.leads} prospectos`],
  ];
  return <section className="admin-section">
    <h2 className="panel-subtitle">Estadísticas {team ? `del equipo${s.team ? ` (${s.team} vendedor(es))` : ''}` : 'de mi perfil'}</h2>
    <div className="metric-grid">{tiles.map(([t, v, h]) => <div className="metric-card" key={t}><span>{t}</span><b>{v.toLocaleString('es-MX')}</b><small>{h}</small></div>)}</div>
  </section>;
}
