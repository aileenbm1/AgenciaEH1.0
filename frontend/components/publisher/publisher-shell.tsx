"use client";
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BadgeCheck, Building2, CalendarDays, ChartColumn, CircleHelp, Ellipsis, ExternalLink, House, Landmark, LogOut, MessageSquare, UserRound, UsersRound, X } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { SessionUser, signOut } from '@/lib/auth';
import { usePublisherPending } from './use-publisher-pending';

export type PublisherSection = 'inicio' | 'propiedades' | 'reservas' | 'mensajes' | 'equipo' | 'perfil' | 'estadisticas' | 'membresia' | 'pagos' | 'ayuda';
const HOME: Record<string, string> = { AGENT: '/panel/agente', AGENCY: '/panel/agencia', DEVELOPER: '/panel/desarrollador' };
const ROLE_NAME: Record<string, string> = { AGENT: 'Asesor', AGENCY: 'Agencia', DEVELOPER: 'Desarrolladora' };

/** Menú del anunciante: lateral en computadora; en celular, barra inferior con lo más usado y "Más". */
export default function PublisherShell({ user, active, children }: { user: SessionUser; active: PublisherSection; children: ReactNode }) {
  const router = useRouter();
  const { counts, total } = usePublisherPending();
  const [open, setOpen] = useState(false);
  useEffect(() => { document.body.classList.add('admin-mode', 'pub-mode'); return () => document.body.classList.remove('admin-mode', 'pub-mode'); }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const org = user.role === 'AGENCY' || user.role === 'DEVELOPER';
  const home = HOME[user.role] || '/panel/agente';
  const first = user.fullName.trim().split(' ')[0];
  const badge = (v?: number) => (v ? <span className="adm-n">{v}</span> : null);
  const item = (key: PublisherSection, href: string, Icon: typeof House, label: string, count?: number) =>
    <Link key={key} href={href} className={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.75} aria-hidden />{label}{badge(count)}</Link>;

  const side = <aside className="adm-side">
    <Link href={home} className="adm-logo" aria-label="Mi Casa · mi panel" onClick={() => setOpen(false)}><BrandLogo variant="compact" /></Link>
    <div className="adm-who"><span className="adm-av">{first.charAt(0).toUpperCase()}</span><div><b>{first}</b><small>{ROLE_NAME[user.role] || ''}</small></div></div>
    <nav className="adm-nav" aria-label="Mi panel">
      {item('inicio', home, House, 'Inicio', total || undefined)}
      {item('propiedades', '/panel/agente/propiedades', Building2, 'Mis propiedades', counts.propiedades)}
      {item('reservas', '/panel/reservas', CalendarDays, 'Reservas', counts.reservas)}
      {item('mensajes', '/panel/prospectos', MessageSquare, 'Mensajes de interesados', counts.mensajes)}
      {org && item('equipo', '/panel/equipo', UsersRound, 'Mi equipo')}
      <div className="adm-grp">MI CUENTA</div>
      {item('perfil', '/panel/perfil-publico', UserRound, 'Perfil público')}
      {item('estadisticas', '/panel/estadisticas', ChartColumn, 'Estadísticas')}
      {item('membresia', '/panel/membresia', BadgeCheck, 'Mi membresía', counts.membresia)}
      {item('pagos', '/panel/datos-de-pago', Landmark, 'Datos para recibir pagos')}
      <div className="adm-grp">AYUDA</div>
      {item('ayuda', '/panel/ayuda', CircleHelp, 'Cómo publicar')}
    </nav>
    <div className="adm-nav adm-foot">
      <Link href="/" target="_blank"><ExternalLink size={18} strokeWidth={1.75} aria-hidden />Ver sitio público</Link>
      <button type="button" onClick={async () => { await signOut(); router.push('/'); router.refresh(); }}><LogOut size={18} strokeWidth={1.75} aria-hidden />Salir</button>
    </div>
  </aside>;

  const tab = (key: PublisherSection, href: string, Icon: typeof House, label: string, count?: number) =>
    <Link href={href} className={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined}><span className="pub-tab-ic"><Icon size={21} strokeWidth={1.75} aria-hidden />{count ? <i>{count}</i> : null}</span>{label}</Link>;
  const moreActive = !['inicio', 'propiedades', 'reservas', 'mensajes'].includes(active);

  return <div className="adm-app pub-app">
    <div className="adm-bar pub-bar">
      <Link href={home} className="adm-bar-logo" aria-label="Mi Casa · mi panel"><BrandLogo variant="compact" /></Link>
      <Link href="/panel/perfil-publico" className="adm-av" aria-label="Mi perfil">{first.charAt(0).toUpperCase()}</Link>
    </div>
    <div className="adm-desk">{side}</div>
    {open && <div className="adm-drawer" role="dialog" aria-modal="true" aria-label="Menú"><div className="adm-drawer-panel">{side}<button type="button" className="adm-drawer-x" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></div><div className="adm-shade" onClick={() => setOpen(false)} /></div>}
    <div className="adm-main">{children}</div>
    <nav className="pub-tabs" aria-label="Accesos rápidos">
      {tab('inicio', home, House, 'Inicio', total || undefined)}
      {tab('propiedades', '/panel/agente/propiedades', Building2, 'Propiedades', counts.propiedades)}
      {tab('reservas', '/panel/reservas', CalendarDays, 'Reservas', counts.reservas)}
      {tab('mensajes', '/panel/prospectos', MessageSquare, 'Mensajes', counts.mensajes)}
      <button type="button" className={moreActive ? 'on' : ''} onClick={() => setOpen(true)}><span className="pub-tab-ic"><Ellipsis size={21} strokeWidth={1.75} aria-hidden />{counts.membresia ? <i>{counts.membresia}</i> : null}</span>Más</button>
    </nav>
  </div>;
}
