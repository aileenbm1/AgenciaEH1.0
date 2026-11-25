"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BadgeDollarSign, CircleCheck, ClipboardCheck, Paintbrush, Plus, UserPlus } from 'lucide-react';
import ProtectedPanel from '@/components/protected-panel';
import AdminShell from '@/components/admin/admin-shell';
import ModerationQueue from '@/components/admin/moderation-queue';
import { usePending } from '@/components/admin/use-pending';
import { authJson, SessionUser } from '@/lib/auth';
import { ROLES } from '@/lib/roles';
import { mxn } from '@/lib/data';

type Metrics = { users: { total: number; new30: number }; properties: { byStatus: Record<string, number> }; memberships: { active: number; expiring7: number }; payments: { monthTotal: number; monthCount: number } };
const shortDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' });
const list = (xs: string[], total: number) => xs.slice(0, 2).join(' · ') + (total > 2 ? ` y ${total - 2} más` : '');

function Todo({ n, tone, title, detail, href, action, primary, urgent }: { n: number | null; tone: 'urg' | 'warn' | 'info' | 'ok'; title: string; detail: string; href?: string; action?: string; primary?: boolean; urgent?: boolean }) {
  return <div className={`adm-todo${tone === 'ok' ? ' done' : ''}`}>
    <span className={`adm-cnt ${tone}`}>{n === null ? <CircleCheck size={20} aria-hidden /> : n}</span>
    <div><b>{title}{urgent && <span className="adm-tag">URGENTE</span>}</b><small>{detail}</small></div>
    {href && action && <Link className={`button ${primary ? 'button-navy' : 'button-outline'} adm-todo-btn`} href={href}>{action} <ArrowRight size={16} aria-hidden /></Link>}
  </div>;
}

function Inicio({ user }: { user: SessionUser }) {
  const { data: p, total } = usePending();
  const [m, setM] = useState<Metrics | null>(null);
  useEffect(() => { authJson<Metrics>('/admin/metrics').then(setM).catch(() => {}); }, []);
  const h = new Date().getHours();
  const hello = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const s = m?.properties.byStatus || {};

  return <AdminShell user={user} active="inicio">
    <div className="adm-top">
      <div><h1>{hello}, {user.fullName.trim().split(' ')[0]}</h1>
        <p className="adm-date">{today.charAt(0).toUpperCase() + today.slice(1)}{p ? ` · ${total ? `Tienes ${total} pendiente${total === 1 ? '' : 's'}` : 'Todo al día'}` : ''}</p></div>
      <div className="adm-top-acts">
        <Link className="button button-navy" href="/panel/agente/propiedades#nueva"><Plus size={16} aria-hidden /> Nueva propiedad</Link>
      </div>
    </div>

    {p && <div className="adm-today"><b>Hoy:</b> {total ? [
      p.review.count && `${p.review.count} propiedad${p.review.count === 1 ? '' : 'es'} por revisar`,
      p.payDue.length && `${p.payDue.length} pago${p.payDue.length === 1 ? '' : 's'} por cobrar`,
      p.reservations.count && `${p.reservations.count} reserva${p.reservations.count === 1 ? '' : 's'} por aceptar`,
      p.accounts.count && `${p.accounts.count} cuenta${p.accounts.count === 1 ? '' : 's'} nueva${p.accounts.count === 1 ? '' : 's'}`,
      p.leads.count && `${p.leads.count} mensaje${p.leads.count === 1 ? '' : 's'} sin responder`,
    ].filter(Boolean).join(' · ') : 'todo al día ✓'}</div>}

    <div className="adm-big">
      <Link href="/panel/admin/propiedades" className={p?.review.count ? 'hot' : ''}><ClipboardCheck size={24} strokeWidth={1.6} aria-hidden /><b>Revisar propiedades{p?.review.count ? <i>{p.review.count}</i> : null}</b><small>Aprueba o pide cambios</small></Link>
      <Link href="/panel/admin/pagos?registrar=1" className={p?.payDue.length ? 'hot' : ''}><BadgeDollarSign size={24} strokeWidth={1.6} aria-hidden /><b>Registrar pago{p?.payDue.length ? <i>{p.payDue.length}</i> : null}</b><small>Membresías y reservas</small></Link>
      <Link href="/panel/admin/sitio"><Paintbrush size={24} strokeWidth={1.6} aria-hidden /><b>Editar el sitio</b><small>Textos, fotos y colores</small></Link>
      <Link href="/panel/admin/personas?crear=1" className={p?.accounts.count ? 'hot' : ''}><UserPlus size={24} strokeWidth={1.6} aria-hidden /><b>Crear cuenta{p?.accounts.count ? <i>{p.accounts.count}</i> : null}</b><small>Agente, agencia o desarrolladora</small></Link>
    </div>

    <section className="adm-sec first">
      <div className="adm-sec-h"><h2>Pendientes de hoy</h2></div>
      {!p ? <p className="muted">Cargando pendientes…</p> : <div className="adm-card">
        {p.payDue.map(d => <Todo key={d.id} n={1} tone="urg" urgent={d.payBy <= p.today} title={d.payBy < p.today ? 'Pago vencido' : d.payBy === p.today ? 'Pago por liquidar hoy' : `Pago por liquidar el ${shortDay(d.payBy)}`}
          detail={`${d.guest} · ${d.title} · faltan ${mxn(d.remaining)} · llega el ${shortDay(d.checkIn)}`} href={`/panel/reservas/${d.id}`} action="Ver reserva" primary />)}
        {p.review.count > 0 && <Todo n={p.review.count} tone="warn" title={p.review.count === 1 ? 'Propiedad por revisar' : 'Propiedades por revisar'} detail={list(p.review.items.map(x => x.title), p.review.count)} href="/panel/admin/propiedades" action="Revisar" primary />}
        {p.reservations.count > 0 && <Todo n={p.reservations.count} tone="warn" title={p.reservations.count === 1 ? 'Reserva por aceptar' : 'Reservas por aceptar'}
          detail={p.reservations.items[0] ? `${p.reservations.items[0].title} · ${p.reservations.items[0].guest}${p.reservations.items[0].checkIn ? ` · ${shortDay(p.reservations.items[0].checkIn)}${p.reservations.items[0].checkOut ? ` → ${shortDay(p.reservations.items[0].checkOut)}` : ''}` : ''} · ${mxn(p.reservations.items[0].total)}${p.reservations.count > 1 ? ` y ${p.reservations.count - 1} más` : ''}` : ''}
          href={p.reservations.count === 1 ? `/panel/reservas/${p.reservations.items[0].id}` : '/panel/reservas'} action="Ver" />}
        {p.accounts.count > 0 && <Todo n={p.accounts.count} tone="info" title={p.accounts.count === 1 ? 'Cuenta por aprobar' : 'Cuentas por aprobar'}
          detail={p.accounts.items.map(a => `${a.fullName} (${ROLES[a.role as keyof typeof ROLES]?.label || a.role})`).slice(0, 2).join(' · ')} href="/panel/admin/personas?filtro=pendientes" action="Ver" />}
        {p.leads.count > 0 && <Todo n={p.leads.count} tone="info" title={p.leads.count === 1 ? 'Mensaje sin responder' : 'Mensajes sin responder'} detail={p.leads.titles.length ? `De interesados en ${p.leads.titles.slice(0, 2).join(' y ')}` : 'De interesados en tus propiedades'} href="/panel/prospectos" action="Responder" />}
        {p.memberships.count > 0
          ? <Todo n={p.memberships.count} tone="warn" title={p.memberships.count === 1 ? 'Membresía por vencer' : 'Membresías por vencer'} detail={p.memberships.items.map(x => `${x.fullName} · ${shortDay(x.periodEnd)}`).join(' · ')} href="/panel/admin/pagos" action="Ver" />
          : <Todo n={null} tone="ok" title="Membresías" detail="Ninguna vence esta semana" />}
        {total === 0 && <Todo n={null} tone="ok" title="Todo al día" detail="No hay propiedades, cuentas, reservas ni mensajes pendientes." />}
      </div>}
    </section>

    <section className="adm-sec">
      <div className="adm-sec-h"><h2>Resumen del mes</h2></div>
      <div className="adm-kpis">
        <div className="adm-kpi"><span>PROPIEDADES PUBLICADAS</span><b>{m ? s.PUBLISHED || 0 : '—'}</b><small>{m ? `${s.REVIEW || 0} en revisión · ${s.DRAFT || 0} borrador${(s.DRAFT || 0) === 1 ? '' : 'es'}` : ''}</small></div>
        <div className="adm-kpi"><span>INGRESOS DEL MES</span><b>{m ? mxn(m.payments.monthTotal) : '—'}</b><small>{m ? `${m.payments.monthCount} pago${m.payments.monthCount === 1 ? '' : 's'} de membresía` : ''}</small></div>
        <div className="adm-kpi"><span>MEMBRESÍAS ACTIVAS</span><b>{m ? m.memberships.active : '—'}</b><small>{m ? `${m.memberships.expiring7} vence${m.memberships.expiring7 === 1 ? '' : 'n'} en 7 días` : ''}</small></div>
        <div className="adm-kpi"><span>USUARIOS</span><b>{m ? m.users.total : '—'}</b><small>{m ? `${m.users.new30} nuevos en 30 días` : ''}</small></div>
      </div>
    </section>

    <ModerationQueue limit={3} showAllLink />
  </AdminShell>;
}

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{user => <Inicio user={user} />}</ProtectedPanel>;
}
