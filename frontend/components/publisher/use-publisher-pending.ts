"use client";
import { useCallback, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';

export type Step = { key: string; done: boolean; label: string; href: string };
export type PublisherPending = {
  today: string;
  payDue: { id: string; checkIn: string; payBy: string; title: string; guest: string; remaining: number }[];
  receipts: { id: string; reservationId: string; amount: number; title: string; guest: string; createdAt: string }[];
  reservations: { id: string; kind: string; checkIn: string | null; checkOut: string | null; guests: number | null; total: number; title: string; guest: string }[];
  messages: { id: string; name: string; title: string | null }[];
  visits: { id: string; name: string; title: string | null; visitAt: string | null }[];
  drafts: { id: string; title: string; missing: string[] }[];
  rejected: { id: string; title: string; note: string | null }[];
  stale?: { id: string; title: string; paused: boolean; reason: string | null }[];
  waitlist: { id: string; title: string; availability: string; availableFrom: string | null; daysLeft: number | null; watchers: number; shared: number; soon: boolean }[];
  membership: { status: 'none' | 'active' | 'expiring' | 'expired'; periodEnd: string | null; daysLeft: number | null; plan: string | null };
  steps: Step[] | null;
  kpis: { profileViews: number; published: number; drafts: number; review: number; leads30: number; visits30: number; activeReservations: number; collectedMonth: number };
};

export const refreshPublisherPending = () => window.dispatchEvent(new Event('publisher:pending'));
let cache: { at: number; data: PublisherPending } | null = null;

/** Pendientes del anunciante (menú, barra inferior e Inicio). */
export function usePublisherPending(enabled = true) {
  const [data, setData] = useState<PublisherPending | null>(enabled ? cache?.data ?? null : null);
  const load = useCallback(async (force = false) => {
    if (!enabled) return;
    if (!force && cache && Date.now() - cache.at < 15000) { setData(cache.data); return; }
    try { const d = await authJson<PublisherPending>('/panel/pending'); cache = { at: Date.now(), data: d }; setData(d); } catch { /* sin contadores */ }
  }, [enabled]);
  useEffect(() => {
    load();
    const h = () => load(true);
    window.addEventListener('publisher:pending', h);
    return () => window.removeEventListener('publisher:pending', h);
  }, [load]);
  const counts = data ? {
    reservas: data.reservations.length + data.receipts.length + data.payDue.length,
    mensajes: data.messages.length + data.visits.length,
    propiedades: data.drafts.length + data.rejected.length + (data.waitlist || []).filter(w => w.soon).length + (data.stale || []).length,
    membresia: data.membership.status === 'expiring' || data.membership.status === 'expired' || data.membership.status === 'none' ? 1 : 0,
  } : { reservas: 0, mensajes: 0, propiedades: 0, membresia: 0 };
  const total = counts.reservas + counts.mensajes + counts.propiedades + counts.membresia;
  return { data, counts, total, reload: () => load(true) };
}
