"use client";
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedPanel from '@/components/protected-panel';
import { authJson, roleHome, SessionUser } from '@/lib/auth';
import { mxn } from '@/lib/data';
import { RES_KIND, RES_STATUS, ResRow, resWhen } from '@/lib/reservations';

function Reservations({ user }: { user: SessionUser }) {
  const publisher = user.role !== 'BUYER';
  const [as, setAs] = useState<'owner' | 'guest'>(publisher ? 'owner' : 'guest');
  const [status, setStatus] = useState('');
  const [items, setItems] = useState<ResRow[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await authJson<ResRow[]>(`/reservations?as=${as}${status ? `&status=${status}` : ''}`)); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudieron cargar las reservas.'); } finally { setLoading(false); }
  }, [as, status]);
  useEffect(() => { load(); }, [load]);
  const pending = items.filter(i => i.status === 'PENDING').length;

  return <main className="page-wrap">
    <Link href={roleHome[user.role]} className="back-link">← Volver a mi panel</Link>
    <div className="page-heading panel-heading"><div><span className="eyebrow">RENTAS Y APARTADOS EN LÍNEA</span>
      <h1>{as === 'guest' ? 'Mis reservas' : user.role === 'ADMIN' ? 'Todas las reservas' : 'Reservas de mis propiedades'}</h1>
      <p>{as === 'guest' ? 'Tus solicitudes de renta y de apartado. Todo el trato es en línea; solo el pago se hace por transferencia o en persona.' : 'Aprueba o rechaza solicitudes, agenda la cita de pago, registra el anticipo (queda apartada) y cierra la operación.'}</p></div></div>
    <ol className="flow-steps res-flow">{['Solicitud', 'Aprobación', 'Cita de pago', 'Anticipo → apartada', 'Pago → cerrada'].map((t, i) => <li key={t}><span className="step-num">{i + 1}</span><div><b>{t}</b></div></li>)}</ol>
    <div className="filters-row">
      {publisher && user.role !== 'ADMIN' && <div className="auth-tabs" role="tablist">
        <button role="tab" aria-selected={as === 'owner'} className={as === 'owner' ? 'selected' : ''} onClick={() => setAs('owner')}>De mis propiedades</button>
        <button role="tab" aria-selected={as === 'guest'} className={as === 'guest' ? 'selected' : ''} onClick={() => setAs('guest')}>Las que yo pedí</button></div>}
      <label>Estado<select value={status} onChange={e => setStatus(e.target.value)}><option value="">Todos</option>{Object.entries(RES_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
      <button className="button button-outline" onClick={load} disabled={loading}>Actualizar</button>
    </div>
    {error && <div className="notice" role="alert">{error}</div>}
    {!status && pending > 0 && as === 'owner' && <div className="notice" role="status">Tienes <b>{pending}</b> solicitud(es) por aprobar.</div>}
    {loading ? <p className="muted">Cargando…</p> : items.length === 0
      ? <div className="empty-start">{as === 'guest' ? <>Aún no tienes reservas. <Link className="inline-link" href="/propiedades">Explora propiedades</Link> y usa “Reserva en línea” en la ficha.</> : 'Aún no hay solicitudes.'}</div>
      : <div className="res-list">{items.map(r => { const st = RES_STATUS[r.status] || { label: r.status, tone: 'neutral' as const };
        return <Link key={r.id} href={`/panel/reservas/${r.id}`} className="dashboard-card res-card">
          {r.property.cover ? <img src={r.property.cover} alt="" /> : <div className="img-missing">Sin foto</div>}
          <div><i className={`status-pill ${st.tone}`}>{st.label}</i> <small className="muted">{RES_KIND[r.kind]}</small>
            <h3>{r.property.title}</h3>
            <p className="meta">{resWhen(r)}</p>
            <p className="meta">{as === 'guest' ? `Anunciante: ${r.owner.fullName}` : `Interesado: ${r.guest.fullName}`}{r.appointmentAt ? ' · cita agendada' : ''}</p>
          </div>
          <strong>{mxn(r.total)}</strong>
        </Link>; })}</div>}
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['BUYER', 'AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{user => <Reservations user={user} />}</ProtectedPanel>;
}
