"use client";
import { useEffect, useState } from 'react';
import { authJson, SessionUser } from '@/lib/auth';
import { activeStays, guestStatus, ResRow } from '@/lib/reservations';

export type SummaryItem = { n: number; label: string; href: string; warn?: boolean };
export type MenuItem = { label: string; href: string; n?: number; icon: string };
export type Summary = {
  total: number; items: SummaryItem[]; menu: MenuItem[]; panel: string;
  alerts?: { label: string; href: string }[];
  stay?: { id: string; title: string; cover: string | null; when: string; note: string; urgent: boolean; pay: boolean } | null; favs?: number;
};
const pl = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`.replace(/^\d+ /, '');
const day = (d: string | null) => d ? new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', timeZone: 'UTC' }) : '';
const HOME: Record<string, string> = { ADMIN: '/panel/admin', AGENT: '/panel/agente', AGENCY: '/panel/agencia', DEVELOPER: '/panel/desarrollador', BUYER: '/panel/comprador' };

async function build(user: SessionUser): Promise<Summary> {
  const panel = HOME[user.role] || '/panel/comprador';
  if (user.role === 'ADMIN') {
    const p = await authJson<any>('/admin/pending').catch(() => null);
    const items: SummaryItem[] = !p ? [] : [
      { n: p.review.count, label: pl(p.review.count, 'propiedad por revisar', 'propiedades por revisar'), href: '/panel/admin/propiedades', warn: true },
      { n: p.payDue.length, label: pl(p.payDue.length, 'pago por cobrar', 'pagos por cobrar'), href: '/panel/admin', warn: true },
      { n: p.reservations.count, label: pl(p.reservations.count, 'reserva por aceptar', 'reservas por aceptar'), href: '/panel/reservas' },
      { n: p.accounts.count, label: pl(p.accounts.count, 'cuenta nueva', 'cuentas nuevas'), href: '/panel/admin/personas?filtro=pendientes' },
      { n: p.leads.count, label: pl(p.leads.count, 'mensaje sin responder', 'mensajes sin responder'), href: '/panel/prospectos' },
    ].filter(x => x.n > 0);
    const total = items.reduce((s, x) => s + x.n, 0);
    return { total, items, panel, menu: [
      { icon: '▦', label: 'Mi panel', href: panel, n: total },
      { icon: '✓', label: 'Revisar propiedades', href: '/panel/admin/propiedades', n: p?.review.count },
      { icon: '$', label: 'Pagos', href: '/panel/admin/pagos', n: p?.payDue.length },
      { icon: '👥', label: 'Personas', href: '/panel/admin/personas', n: p?.accounts.count },
      { icon: '🖌', label: 'Editar el sitio', href: '/panel/admin/sitio' },
      { icon: '❔', label: 'Ayuda (cómo funciona)', href: '/como-funciona' },
    ] };
  }
  if (user.role === 'BUYER') {
    const [res, favs, watches] = await Promise.all([authJson<ResRow[]>('/reservations?as=guest').catch(() => []), authJson<unknown[]>('/favorites').catch(() => []),
      authJson<{ title: string; slug: string; notice: string | null; unseen: boolean }[]>('/watches').catch(() => [])]);
    const alerts = watches.filter(w => w.unseen && w.notice).slice(0, 2).map(w => ({ href: `/propiedades/${w.slug}`,
      label: w.notice === 'available' ? `${w.title} ya está disponible` : w.notice === 'soon' ? `${w.title} se libera pronto` : `${w.title} bajó de precio` }));
    const { next } = activeStays(res);
    const stay = next ? (() => { const g = guestStatus(next); return { id: next.id, title: next.property.title, cover: next.property.cover, urgent: g.urgent, note: g.text,
      pay: next.remaining > 0 && ['APPROVED', 'DEPOSIT_PAID'].includes(next.status),
      when: next.checkIn ? `${next.kind === 'SALE' ? '' : 'llegas el '}${day(next.checkIn)}${next.nights ? ` · ${next.nights} noche${next.nights === 1 ? '' : 's'}` : ''}${next.guests ? ` · ${next.guests} persona${next.guests === 1 ? '' : 's'}` : ''}` : '' }; })() : null;
    const unseen = watches.filter(w => w.unseen).length;
    const total = (stay?.urgent ? 1 : 0) + unseen;
    return { total, items: [], panel, stay, favs: favs.length, alerts, menu: [
      { icon: '▦', label: 'Mi panel', href: panel, n: total },
      { icon: '📅', label: 'Mis reservas', href: '/panel/reservas', n: stay?.urgent ? 1 : 0 },
      { icon: '🔔', label: `Mis avisos${watches.length ? ` (${watches.length})` : ''}`, href: '/panel/comprador#avisos', n: unseen },
      { icon: '♥', label: `Favoritos${favs.length ? ` (${favs.length})` : ''}`, href: '/panel/comprador#favoritos' },
      { icon: '👤', label: 'Mi cuenta', href: '/cuenta' },
    ] };
  }
  const p = await authJson<any>('/panel/pending').catch(() => null);
  const msgs = p ? p.messages.length + p.visits.length : 0;
  const memb = p && ['expiring', 'expired', 'none'].includes(p.membership.status);
  const items: SummaryItem[] = !p ? [] : [
    { n: p.reservations.length, label: pl(p.reservations.length, 'reserva por aprobar', 'reservas por aprobar'), href: '/panel/reservas', warn: true },
    { n: p.receipts.length, label: pl(p.receipts.length, 'comprobante por revisar', 'comprobantes por revisar'), href: p.receipts.length === 1 ? `/panel/reservas/${p.receipts[0].reservationId}` : '/panel/reservas', warn: true },
    { n: p.payDue.length, label: pl(p.payDue.length, 'pago por cobrar', 'pagos por cobrar'), href: '/panel/reservas' },
    { n: msgs, label: pl(msgs, 'mensaje nuevo', 'mensajes nuevos'), href: '/panel/prospectos' },
    { n: p.rejected.length, label: pl(p.rejected.length, 'propiedad por corregir', 'propiedades por corregir'), href: '/panel/agente/propiedades', warn: true },
    ...(p.waitlist || []).filter((w: any) => w.soon).slice(0, 2).map((w: any) => ({ n: w.watchers, label: `esperan “${w.title.length > 26 ? w.title.slice(0, 25) + '…' : w.title}” (se libera en ${w.daysLeft} día${w.daysLeft === 1 ? '' : 's'})`, href: '/panel/agente/propiedades', warn: true })),
    { n: memb ? 1 : 0, label: p.membership.status === 'expired' ? 'membresía vencida' : p.membership.status === 'none' ? 'membresía por activar' : `membresía vence en ${p.membership.daysLeft} días`, href: '/panel/membresia' },
  ].filter(x => x.n > 0);
  const total = items.reduce((s, x) => s + x.n, 0);
  return { total, items, panel, menu: [
    { icon: '▦', label: 'Mi panel', href: panel, n: total },
    { icon: '🏠', label: 'Mis propiedades', href: '/panel/agente/propiedades', n: p ? p.rejected.length + p.drafts.length : 0 },
    { icon: '📅', label: 'Reservas', href: '/panel/reservas', n: p ? p.reservations.length + p.receipts.length : 0 },
    { icon: '✉', label: 'Mensajes de interesados', href: '/panel/prospectos', n: msgs },
    { icon: '＋', label: 'Nueva propiedad', href: '/panel/agente/propiedades#nueva' },
    { icon: '👤', label: 'Perfil público', href: '/panel/perfil-publico' },
  ] };
}

let cache: { key: string; at: number; data: Summary } | null = null;
let inflight: { key: string; p: Promise<Summary> } | null = null;

/** Resumen de pendientes para la franja de bienvenida y el menú del usuario (una sola consulta compartida). */
export function useSessionSummary(user: SessionUser | null) {
  const key = user ? `${user.id}:${user.role}` : '';
  const [data, setData] = useState<Summary | null>(cache && cache.key === key ? cache.data : null);
  useEffect(() => {
    if (!user) { setData(null); return; }
    if (cache && cache.key === key && Date.now() - cache.at < 30000) { setData(cache.data); return; }
    if (!inflight || inflight.key !== key) inflight = { key, p: build(user) };
    let alive = true;
    inflight.p.then(d => { cache = { key, at: Date.now(), data: d }; if (alive) setData(d); }).catch(() => {}).finally(() => { inflight = null; });
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  return data;
}
