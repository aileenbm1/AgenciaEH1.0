"use client";
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Banknote, CircleCheck, Plus, Share2 } from 'lucide-react';
import { authJson, SessionUser } from '@/lib/auth';
import { AVAILABILITY, PROPERTY_STATUS } from '@/lib/roles';
import { mxn } from '@/lib/data';
import { missingFor } from '@/lib/publisher';
import PublisherShell from './publisher-shell';
import { usePublisherPending } from './use-publisher-pending';

type Prop = { id: string; title: string; slug: string; status: string; availability: keyof typeof AVAILABILITY; price: number | string; operation: string; municipality: string; neighborhood?: string | null; description?: string | null; images: { url: string }[]; reviewNote?: string | null };
const shortDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
const longDay = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const when = (iso: string) => new Date(iso).toLocaleString('es-MX', { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

function Todo({ n, tone, title, detail, href, action, primary, urgent, icon }: { n: number | null; tone: 'urg' | 'warn' | 'info' | 'ok'; title: string; detail: string; href?: string; action?: string; primary?: boolean; urgent?: boolean; icon?: React.ReactNode }) {
  return <div className={`adm-todo${tone === 'ok' ? ' done' : ''}`}>
    <span className={`adm-cnt ${tone}`}>{n === null ? <CircleCheck size={20} aria-hidden /> : n}</span>
    <div><b>{title}{urgent && <span className="adm-tag">URGENTE</span>}</b><small>{detail}</small></div>
    {href && action && <Link className={`button ${primary ? 'button-navy' : 'button-outline'} adm-todo-btn`} href={href}>{icon}{action}{!icon && <ArrowRight size={16} aria-hidden />}</Link>}
  </div>;
}

/** Inicio de agentes, agencias y desarrolladoras: lo pendiente primero, primeros pasos y números del mes. */
export default function PublisherHome({ user }: { user: SessionUser }) {
  const { data: p, total } = usePublisherPending();
  const [props, setProps] = useState<Prop[] | null>(null);
  const [hideSteps, setHideSteps] = useState(false);
  const [msg, setMsg] = useState('');
  useEffect(() => { authJson<Prop[]>('/properties/mine').then(setProps).catch(() => setProps([])); try { setHideSteps(localStorage.getItem('mc-steps-hidden') === '1'); } catch { /* sin almacenamiento */ } }, []);
  const h = new Date().getHours();
  const hello = h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches';
  const today = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' });
  const org = user.role === 'AGENCY' || user.role === 'DEVELOPER';
  async function shareProfile() {
    const step = p?.steps?.find(s => s.key === 'comparte');
    const path = step?.href?.startsWith('/agencias') || step?.href?.startsWith('/asesores') ? step.href : null;
    try {
      const prof = path ? null : await authJson<{ slug?: string }>(org ? '/agencies/me' : '/agents/me').catch(() => null);
      const url = `${location.origin}${path || (prof?.slug ? `/${org ? 'agencias' : 'asesores'}/${prof.slug}` : '')}`;
      if (navigator.share) await navigator.share({ title: 'Mi perfil en Mi Casa', url }); else { await navigator.clipboard.writeText(url); setMsg('Enlace de tu perfil copiado. Pégalo en WhatsApp o en tus redes.'); }
    } catch { /* cancelado */ }
  }
  const m = p?.membership;

  return <PublisherShell user={user} active="inicio">
    <div className="adm-top">
      <div><h1>{hello}, {user.fullName.trim().split(' ')[0]}</h1>
        <p className="adm-date">{today.charAt(0).toUpperCase() + today.slice(1)}{p ? ` · ${total ? `Tienes ${total} pendiente${total === 1 ? '' : 's'}` : 'Todo al día'}` : ''}</p></div>
      <div className="adm-top-acts">
        <Link className="button button-navy" href="/panel/agente/propiedades#nueva"><Plus size={16} aria-hidden /> Nueva propiedad</Link>
        <button type="button" className="button button-outline" onClick={shareProfile}><Share2 size={16} aria-hidden /> Compartir mi perfil</button>
      </div>
    </div>
    {user.approvalStatus === 'PENDING' && <div className="notice" role="status"><b>Tu cuenta está en revisión.</b> El equipo de Mi Casa la aprobará pronto; mientras tanto puedes preparar tus propiedades como borrador.</div>}
    {msg && <div className="notice ok" role="status">{msg}</div>}

    {p?.steps && !hideSteps && <section className="adm-sec first pub-steps">
      <div className="adm-card adm-pad">
        <div className="pub-steps-h"><div><b>Primeros pasos</b><small>{p.steps.filter(s => s.done).length} de {p.steps.length} listos · completa tu cuenta para empezar a recibir clientes</small></div>
          <button type="button" className="inline-link" onClick={() => { setHideSteps(true); try { localStorage.setItem('mc-steps-hidden', '1'); } catch { /* */ } }}>Ocultar</button></div>
        <div className="prog"><i style={{ width: `${(p.steps.filter(s => s.done).length / p.steps.length) * 100}%` }} /></div>
        <ol className="pub-step-list">{p.steps.map(s => <li key={s.key} className={s.done ? 'done' : ''}>
          <span className="pub-check" aria-hidden>{s.done ? '✓' : ''}</span>{s.done ? <span>{s.label}</span> : <Link href={s.href}>{s.label} →</Link>}</li>)}</ol>
      </div>
    </section>}

    <section className={`adm-sec${p?.steps && !hideSteps ? '' : ' first'}`}>
      <div className="adm-sec-h"><h2>Pendientes de hoy</h2></div>
      {!p ? <p className="muted">Cargando pendientes…</p> : <div className="adm-card">
        {p.payDue.map(d => <Todo key={d.id} n={1} tone="urg" urgent={d.payBy <= p.today} title={d.payBy < p.today ? `${d.guest} no ha liquidado` : d.payBy === p.today ? `${d.guest} debe liquidar hoy` : `${d.guest} debe liquidar el ${shortDay(d.payBy)}`}
          detail={`${d.title} · faltan ${mxn(d.remaining)} · llega el ${shortDay(d.checkIn)}`} href={`/panel/reservas/${d.id}`} action="Registrar pago" primary icon={<Banknote size={16} aria-hidden />} />)}
        {p.receipts.map(r => <Todo key={r.id} n={1} tone="warn" title={`Comprobante por revisar · ${mxn(r.amount)}`} detail={`${r.guest} · ${r.title}`} href={`/panel/reservas/${r.reservationId}`} action="Revisar" primary />)}
        {p.reservations.length > 0 && <Todo n={p.reservations.length} tone="warn" title={p.reservations.length === 1 ? 'Reserva por aceptar' : 'Reservas por aceptar'}
          detail={`${p.reservations[0].guest} · ${p.reservations[0].title}${p.reservations[0].checkIn ? ` · ${shortDay(p.reservations[0].checkIn)}` : ''} · ${mxn(p.reservations[0].total)}${p.reservations.length > 1 ? ` y ${p.reservations.length - 1} más` : ''}`}
          href={p.reservations.length === 1 ? `/panel/reservas/${p.reservations[0].id}` : '/panel/reservas'} action="Ver" primary />}
        {(p.waitlist || []).filter(w => w.soon).map(w => <Todo key={'w' + w.id} n={w.watchers} tone="warn" title={`${w.title} se libera en ${w.daysLeft} día${w.daysLeft === 1 ? '' : 's'}`} detail={`${w.watchers} persona${w.watchers === 1 ? '' : 's'} esperan${w.shared ? ` · ${w.shared} te ${w.shared === 1 ? 'compartió' : 'compartieron'} sus datos` : ''}. Márcala como disponible desde esa fecha y les avisamos.`} href="/panel/agente/propiedades" action="Ver" />)}
        {(p.stale || []).map(x => <Todo key={'st' + x.id} n={1} tone="warn" title={x.paused ? `Pausada ${x.reason === 'inactive' ? 'por inactividad' : 'por fecha programada'}: ${x.title}` : `¿Sigue disponible “${x.title}”?`} detail={x.paused ? 'No se muestra al público. Si sigue disponible, reanúdala con un clic.' : 'Confírmalo; si no, se pausará sola para que el catálogo esté al día.'} href="/panel/agente/propiedades" action={x.paused ? 'Reanudar' : 'Confirmar'} />)}
        {p.rejected.map(r => <Todo key={r.id} n={1} tone="urg" title={`Requiere cambios: ${r.title}`} detail={r.note ? `Qué corregir: ${r.note}` : 'El administrador pidió cambios.'} href="/panel/agente/propiedades" action="Corregir" />)}
        {p.messages.length > 0 && <Todo n={p.messages.length} tone="info" title={p.messages.length === 1 ? 'Mensaje sin responder' : 'Mensajes sin responder'} detail={`${p.messages[0].name}${p.messages[0].title ? ` pregunta por ${p.messages[0].title}` : ''}${p.messages.length > 1 ? ` · ${p.messages.length - 1} más` : ''}`} href="/panel/prospectos" action="Responder" />}
        {p.visits.length > 0 && <Todo n={p.visits.length} tone="warn" title={p.visits.length === 1 ? 'Visita por confirmar' : 'Visitas por confirmar'} detail={`${p.visits[0].name}${p.visits[0].visitAt ? ` · ${when(p.visits[0].visitAt)}` : ''}${p.visits[0].title ? ` · ${p.visits[0].title}` : ''}`} href="/panel/prospectos" action="Confirmar" />}
        {p.drafts.slice(0, 2).map(d => <Todo key={d.id} n={1} tone="warn" title="Borrador sin terminar" detail={`${d.title}${d.missing.length ? `: falta ${d.missing.join(', ')}` : ': listo para enviar a revisión'}`} href="/panel/agente/propiedades" action={d.missing.length ? 'Completar' : 'Enviar'} />)}
        {m && (m.status === 'expired' ? <Todo n={null} tone="urg" title="Tu membresía venció" detail={`Venció el ${m.periodEnd ? longDay(m.periodEnd) : ''}. Renuévala para que tus propiedades sigan publicadas.`} href="/panel/membresia" action="Cómo renovar" primary />
          : m.status === 'expiring' ? <Todo n={m.daysLeft} tone="warn" title={`Tu membresía vence en ${m.daysLeft} día${m.daysLeft === 1 ? '' : 's'}`} detail={`Vence el ${m.periodEnd ? longDay(m.periodEnd) : ''}. Renuévala a tiempo para no perder el acceso.`} href="/panel/membresia" action="Cómo renovar" />
          : m.status === 'none' ? <Todo n={null} tone="info" title="Aún no tienes membresía registrada" detail="El administrador la registra cuando recibe tu pago." href="/panel/membresia" action="Ver cómo pagar" />
          : <Todo n={null} tone="ok" title="Tu membresía está activa" detail={`Vence el ${m.periodEnd ? longDay(m.periodEnd) : ''}${m.plan ? ` · Plan ${m.plan.toLowerCase()}` : ''}`} />)}
        {total === 0 && m?.status === 'active' && <Todo n={null} tone="ok" title="Todo al día" detail="No hay reservas, mensajes ni propiedades pendientes." />}
      </div>}
    </section>

    {p && <section className="adm-sec">
      <div className="adm-sec-h"><h2>Tus números {org ? 'del equipo ' : ''}de este mes</h2><Link className="adm-more" href="/panel/estadisticas">Ver estadísticas →</Link></div>
      <div className="adm-kpis">
        <div className="adm-kpi"><span>VISITAS A {org ? 'LOS PERFILES' : 'TU PERFIL'}</span><b>{p.kpis.profileViews}</b><small>Personas que abrieron {org ? 'los perfiles' : 'tu perfil'}</small></div>
        <div className="adm-kpi"><span>PROPIEDADES PUBLICADAS</span><b>{p.kpis.published}</b><small>{p.kpis.review ? `${p.kpis.review} en revisión · ` : ''}{p.kpis.drafts} borrador{p.kpis.drafts === 1 ? '' : 'es'}</small></div>
        <div className="adm-kpi"><span>MENSAJES (30 DÍAS)</span><b>{p.kpis.leads30}</b><small>{p.kpis.visits30} visita{p.kpis.visits30 === 1 ? '' : 's'} agendada{p.kpis.visits30 === 1 ? '' : 's'}</small></div>
        <div className="adm-kpi"><span>RESERVAS ACTIVAS</span><b>{p.kpis.activeReservations}</b><small>{mxn(p.kpis.collectedMonth)} cobrados este mes</small></div>
      </div>
    </section>}

    <section className="adm-sec">
      <div className="adm-sec-h"><h2>Tus propiedades</h2>{props && props.length > 0 && <Link className="adm-more" href="/panel/agente/propiedades">Ver todas →</Link>}</div>
      {!props ? <p className="muted">Cargando…</p> : props.length === 0 ? <div className="adm-empty">Aún no tienes propiedades. <Link className="inline-link" href="/panel/agente/propiedades#nueva">Crea la primera</Link>: tarda unos minutos.</div>
        : <div className="adm-card pub-list">{props.slice(0, 4).map(x => { const st = PROPERTY_STATUS[x.status] || { label: x.status, tone: 'neutral' as const }; const miss = missingFor(x);
          return <Link key={x.id} href="/panel/agente/propiedades" className="pub-row pub-row-link"><div className="pub-row-main">
            {x.images[0]?.url ? <img src={x.images[0].url} alt="" /> : <div className="img-missing">Sin fotos</div>}
            <div className="pub-row-info"><div className="pub-row-pills"><i className={`status-pill ${st.tone}`}>{x.status === 'REJECTED' ? 'Requiere cambios' : st.label}</i>{x.status === 'PUBLISHED' && <i className={`status-pill ${(AVAILABILITY[x.availability] || AVAILABILITY.AVAILABLE).tone}`}>{(AVAILABILITY[x.availability] || AVAILABILITY.AVAILABLE).label}</i>}</div>
              <b className="pub-row-title">{x.title}</b><small>{x.neighborhood ? `${x.neighborhood}, ` : ''}{x.municipality} · {mxn(Number(x.price))}</small>
              {x.status === 'DRAFT' && miss.length > 0 && <div className="pub-miss">Falta: {miss.map(s => <span key={s}>{s}</span>)}</div>}</div>
          </div></Link>; })}</div>}
    </section>
  </PublisherShell>;
}
