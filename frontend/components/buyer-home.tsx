"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, Heart, MessageCircle, Search, TriangleAlert, UserRound } from 'lucide-react';
import { authJson, SessionUser } from '@/lib/auth';
import { mxn } from '@/lib/data';
import { guestStatus, RES_KIND, RES_STATUS, ResRow } from '@/lib/reservations';
import BuyerSections from './buyer-sections';

const day = (d: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';

/** Panel del comprador: su próxima estancia (con lo que falta por pagar) primero, y después favoritos, avisos y mensajes. */
export default function BuyerHome({ user }: { user: SessionUser }) {
  const [res, setRes] = useState<ResRow[] | null>(null);
  const [counts, setCounts] = useState({ favs: 0, searches: 0, sent: 0, visits: 0 });
  useEffect(() => {
    authJson<ResRow[]>('/reservations?as=guest').then(setRes).catch(() => setRes([]));
    Promise.all([authJson<unknown[]>('/favorites').catch(() => []), authJson<unknown[]>('/saved-searches').catch(() => []), authJson<{ kind: string; status: string }[]>('/leads/sent').catch(() => [])])
      .then(([f, s, l]) => setCounts({ favs: f.length, searches: s.length, sent: l.length, visits: l.filter(x => x.kind === 'VISIT' && x.status === 'VISIT_SCHEDULED').length }));
  }, []);
  const active = (res || []).filter(r => ['PENDING', 'APPROVED', 'DEPOSIT_PAID'].includes(r.status) || (r.status === 'COMPLETED' && r.checkOut && r.checkOut >= new Date().toISOString().slice(0, 10)));
  // La más cercana: primero la que tiene pago urgente, luego por fecha de entrada.
  const next = [...active].sort((a, b) => Number(guestStatus(b).urgent) - Number(guestStatus(a).urgent) || String(a.checkIn || '9').localeCompare(String(b.checkIn || '9')))[0];
  const pendingPay = active.filter(r => r.remaining > 0 && ['APPROVED', 'DEPOSIT_PAID'].includes(r.status)).length;
  const first = user.fullName.trim().split(' ')[0];

  return <main className="page-wrap buyer-home">
    <div className="adm-top"><div><h1>Hola, {first}</h1>
      <p className="adm-date">{res === null ? '' : active.length ? `Tienes ${active.length} reserva${active.length === 1 ? '' : 's'} activa${active.length === 1 ? '' : 's'}${pendingPay ? ` y ${pendingPay} pago${pendingPay === 1 ? '' : 's'} pendiente${pendingPay === 1 ? '' : 's'}` : ''}` : 'Encuentra tu próximo espacio y guarda tus favoritos.'}</p></div>
      <div className="adm-top-acts"><Link className="button button-outline" href="/cuenta"><UserRound size={16} aria-hidden /> Mi cuenta</Link></div></div>

    {next && (() => { const g = guestStatus(next); const st = RES_STATUS[next.status] || { label: next.status, tone: 'neutral' as const }; const pct = next.total > 0 ? Math.min(100, Math.round((next.paid / next.total) * 100)) : 0;
      return <section className="adm-sec first"><div className="adm-sec-h"><h2>{next.kind === 'SALE' ? 'Tu apartado' : 'Tu próxima estancia'}</h2><Link className="adm-more" href="/panel/reservas">Ver todas mis reservas →</Link></div>
        <div className="adm-card stay-card">
          {next.property.cover ? <img src={next.property.cover} alt="" /> : <div className="img-missing">Sin foto</div>}
          <div className="stay-in">
            <div><i className={`status-pill ${st.tone}`}>{next.status === 'DEPOSIT_PAID' ? 'Apartada' : st.label}</i> <small className="muted">{RES_KIND[next.kind]}</small></div>
            <h3>{next.property.title}</h3>
            <p className="muted">{next.checkIn ? `${day(next.checkIn)}${next.checkOut ? ` → ${day(next.checkOut)}` : ''}` : ''}{next.nights ? ` · ${next.nights} noche${next.nights === 1 ? '' : 's'}` : ''}{next.guests ? ` · ${next.guests} persona${next.guests === 1 ? '' : 's'}` : ''} · {next.property.municipality}</p>
            {g.urgent ? <div className="stay-alert"><TriangleAlert size={18} aria-hidden /> {g.text}{next.payBy ? ' · el día de entrada ya no se aceptan pagos' : ''}</div> : <p className="stay-status">{g.text}</p>}
            {next.paid > 0 || ['APPROVED', 'DEPOSIT_PAID'].includes(next.status) ? <><div className="prog"><i style={{ width: `${pct}%` }} /></div>
              <div className="stay-money"><span>Pagado <b>{mxn(next.paid)}</b></span><span>Total <b>{mxn(next.total)}</b></span></div></> : null}
            <div className="stay-acts"><Link className="button button-navy" href={`/panel/reservas/${next.id}`}>{next.remaining > 0 && ['APPROVED', 'DEPOSIT_PAID'].includes(next.status) ? 'Ver reserva y pagar' : 'Ver reserva'}</Link>
              <Link className="button button-outline" href={`/panel/reservas/${next.id}#chat`}><MessageCircle size={16} aria-hidden /> Escribir a {next.owner.fullName.split(' ')[0]}</Link></div>
          </div>
        </div></section>; })()}

    <section className={`adm-sec${next ? '' : ' first'}`}><div className="buyer-quick">
      <Link className="adm-card bq primary" href="/propiedades"><span className="bq-ic"><Search size={20} aria-hidden /></span><b>Buscar propiedades</b><small>Renta por noche, por mes o compra</small></Link>
      <a className="adm-card bq" href="#favoritos"><span className="bq-ic"><Heart size={20} aria-hidden /></span><b>Mis favoritos · {counts.favs}</b><small>Las que guardaste</small></a>
      <a className="adm-card bq" href="#busquedas"><span className="bq-ic"><BellRing size={20} aria-hidden /></span><b>Avisos · {counts.searches}</b><small>Te avisamos de propiedades nuevas</small></a>
      <a className="adm-card bq" href="#solicitudes"><span className="bq-ic"><MessageCircle size={20} aria-hidden /></span><b>Mensajes y visitas · {counts.sent}</b><small>{counts.visits ? `${counts.visits} visita${counts.visits === 1 ? '' : 's'} confirmada${counts.visits === 1 ? '' : 's'}` : 'En qué va cada solicitud'}</small></a>
    </div></section>

    <BuyerSections />
  </main>;
}
