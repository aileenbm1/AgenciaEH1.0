"use client";
import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Building2, CalendarDays, CircleHelp, ExternalLink, House, LayoutTemplate, LogOut, Menu, MessageSquare, Palette, SlidersHorizontal, Users, Wallet, X } from 'lucide-react';
import { BrandLogo } from '@/components/brand-logo';
import { SessionUser, signOut } from '@/lib/auth';
import { usePending } from './use-pending';

export type AdminSection = 'inicio' | 'propiedades' | 'reservas' | 'personas' | 'pagos' | 'mensajes' | 'sitio' | 'fanpages' | 'campos' | 'ayuda';

/** Menú lateral del administrador (en celular, un menú que se abre con ☰). */
export default function AdminShell({ user, active, children }: { user: SessionUser; active: AdminSection; children: ReactNode }) {
  const router = useRouter();
  const { data, total } = usePending();
  const [open, setOpen] = useState(false);
  // El encabezado y el pie del sitio público no se muestran dentro del panel.
  useEffect(() => { document.body.classList.add('admin-mode'); return () => document.body.classList.remove('admin-mode'); }, []);
  useEffect(() => { document.body.style.overflow = open ? 'hidden' : ''; return () => { document.body.style.overflow = ''; }; }, [open]);
  const n = (v?: number) => (v ? <span className="adm-n">{v}</span> : null);
  const item = (key: AdminSection, href: string, Icon: typeof House, label: string, count?: number) =>
    <Link key={key} href={href} className={active === key ? 'on' : ''} aria-current={active === key ? 'page' : undefined} onClick={() => setOpen(false)}><Icon size={18} strokeWidth={1.75} aria-hidden />{label}{n(count)}</Link>;
  const first = user.fullName.trim().split(' ')[0];

  const side = <aside className="adm-side">
    <Link href="/panel/admin" className="adm-logo" aria-label="Mi Casa · panel" onClick={() => setOpen(false)}><BrandLogo variant="compact" /></Link>
    <div className="adm-who"><span className="adm-av">{first.charAt(0).toUpperCase()}</span><div><b>{first}</b><small>Administrador</small></div></div>
    <nav className="adm-nav" aria-label="Panel de administración">
      {item('inicio', '/panel/admin', House, 'Inicio', total || undefined)}
      {item('propiedades', '/panel/admin/propiedades', Building2, 'Propiedades', data?.review.count)}
      {item('reservas', '/panel/reservas', CalendarDays, 'Reservas', data ? data.reservations.count + (data.payDue.length ? 1 : 0) : undefined)}
      {item('personas', '/panel/admin/personas', Users, 'Personas', data?.accounts.count)}
      {item('pagos', '/panel/admin/pagos', Wallet, 'Pagos y membresías', data?.memberships.count)}
      {item('mensajes', '/panel/prospectos', MessageSquare, 'Mensajes de interesados', data?.leads.count)}
      <div className="adm-grp">TU SITIO</div>
      {item('sitio', '/panel/admin/sitio', Palette, 'Editar el sitio')}
      {item('fanpages', '/panel/admin/fanpages', LayoutTemplate, 'Fanpages')}
      {item('campos', '/panel/admin/campos', SlidersHorizontal, 'Campos de propiedades')}
      <div className="adm-grp">AYUDA</div>
      {item('ayuda', '/como-funciona', CircleHelp, 'Cómo funciona')}
    </nav>
    <div className="adm-nav adm-foot">
      <Link href="/" target="_blank"><ExternalLink size={18} strokeWidth={1.75} aria-hidden />Ver sitio público</Link>
      <button type="button" onClick={async () => { await signOut(); router.push('/'); router.refresh(); }}><LogOut size={18} strokeWidth={1.75} aria-hidden />Salir</button>
    </div>
  </aside>;

  return <div className="adm-app">
    <div className="adm-bar">
      <button type="button" className="adm-burger" onClick={() => setOpen(true)} aria-label="Abrir menú"><Menu size={20} />{total > 0 && <i>{total}</i>}</button>
      <Link href="/panel/admin" className="adm-bar-logo" aria-label="Mi Casa · panel"><BrandLogo variant="compact" /></Link>
      <span className="adm-av">{first.charAt(0).toUpperCase()}</span>
    </div>
    <div className="adm-desk">{side}</div>
    {open && <div className="adm-drawer" role="dialog" aria-modal="true" aria-label="Menú"><div className="adm-drawer-panel">{side}<button type="button" className="adm-drawer-x" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button></div><div className="adm-shade" onClick={() => setOpen(false)} /></div>}
    <div className="adm-main">{children}</div>
  </div>;
}
