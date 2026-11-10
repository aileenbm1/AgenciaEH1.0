"use client";
import { useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';
import { mxn } from '@/lib/data';
import { ROLES } from '@/lib/roles';
import { fmtDate } from './admin-types';

type Metrics = {
  users: { total: number; byRole: Record<string, number>; pending: number; inactive: number; new30: number; verified: number };
  properties: { total: number; byStatus: Record<string, number> };
  memberships: { active: number; expiring7: number; expired: number; expiring: { id: string; fullName: string; email: string; plan: string; periodEnd: string }[] };
  payments: { monthTotal: number; monthCount: number; monthCash: number; monthTransfer: number; prevMonthTotal: number };
};

export default function AdminMetrics({ refreshKey }: { refreshKey: number }) {
  const [m, setM] = useState<Metrics | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { authJson<Metrics>('/admin/metrics').then(setM).catch(e => setError(e.message)); }, [refreshKey]);
  if (error) return <div className="notice" role="alert">{error}</div>;
  if (!m) return <p className="muted">Cargando métricas…</p>;
  const diff = m.payments.monthTotal - m.payments.prevMonthTotal;
  const st = m.properties.byStatus;
  return <section id="resumen" className="admin-section">
    <h2 className="panel-subtitle">Resumen</h2>
    <div className="metric-grid">
      <article className="metric-card"><span>Usuarios</span><b>{m.users.total}</b><small>+{m.users.new30} en los últimos 30 días{m.users.pending ? ` · ${m.users.pending} por aprobar` : ''}{m.users.inactive ? ` · ${m.users.inactive} desactivados` : ''}</small></article>
      <article className="metric-card"><span>Membresías activas</span><b>{m.memberships.active}</b><small>{m.memberships.expiring7} vencen en 7 días · {m.memberships.expired} vencidas</small></article>
      <article className="metric-card"><span>Ingresos del mes</span><b>{mxn(m.payments.monthTotal)}</b><small>{m.payments.monthCount} pago(s) · {diff >= 0 ? '▲' : '▼'} {mxn(Math.abs(diff))} vs. mes anterior</small></article>
      <article className="metric-card"><span>Propiedades publicadas</span><b>{st.PUBLISHED || 0}</b><small>{st.REVIEW || 0} en revisión · {st.DRAFT || 0} borradores · {m.properties.total} en total</small></article>
    </div>
    <div className="metric-detail">
      <div className="dashboard-card">
        <h3>Usuarios por rol</h3>
        <ul className="bar-list">{(['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN'] as const).map(r => {
          const n = m.users.byRole[r] || 0; const pct = m.users.total ? Math.round(n * 100 / m.users.total) : 0;
          return <li key={r}><span>{ROLES[r].label}</span><i style={{ width: `${pct}%` }} /><b>{n}</b></li>;
        })}</ul>
      </div>
      <div className="dashboard-card">
        <h3>Cobrado este mes</h3>
        <ul className="bar-list">{[['Efectivo', m.payments.monthCash], ['Transferencia', m.payments.monthTransfer]].map(([label, v]) => {
          const pct = m.payments.monthTotal ? Math.round(Number(v) * 100 / m.payments.monthTotal) : 0;
          return <li key={label as string}><span>{label}</span><i style={{ width: `${pct}%` }} /><b>{mxn(Number(v))}</b></li>;
        })}</ul>
      </div>
      <div className="dashboard-card">
        <h3>Membresías por vencer (7 días)</h3>
        {m.memberships.expiring.length === 0 ? <p className="muted">Ninguna membresía vence esta semana.</p>
          : <ul className="plain-list">{m.memberships.expiring.map(x => <li key={x.id}><b>{x.fullName}</b> · {x.plan}<small>{x.email} · vence {fmtDate(x.periodEnd)}</small></li>)}</ul>}
      </div>
    </div>
  </section>;
}
