"use client";
import { useCallback, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';

export type Pending = {
  today: string;
  payDue: { id: string; checkIn: string; payBy: string; title: string; guest: string; remaining: number }[];
  review: { count: number; items: { id: string; title: string }[] };
  reservations: { count: number; items: { id: string; kind: string; checkIn: string | null; checkOut: string | null; guests: number | null; total: number; title: string; guest: string }[] };
  accounts: { count: number; items: { id: string; fullName: string; role: string }[] };
  leads: { count: number; titles: string[] };
  memberships: { count: number; items: { fullName: string; periodEnd: string }[] };
};

/** Avisa a todo el panel que algo cambió (aprobaciones, pagos…) para refrescar los contadores. */
export const refreshPending = () => window.dispatchEvent(new Event('admin:pending'));

let cache: { at: number; data: Pending } | null = null;

/** Pendientes del administrador (menú lateral e Inicio). */
export function usePending() {
  const [data, setData] = useState<Pending | null>(cache?.data ?? null);
  const load = useCallback(async (force = false) => {
    if (!force && cache && Date.now() - cache.at < 15000) { setData(cache.data); return; }
    try { const d = await authJson<Pending>('/admin/pending'); cache = { at: Date.now(), data: d }; setData(d); } catch { /* el panel sigue funcionando sin contadores */ }
  }, []);
  useEffect(() => {
    load();
    const h = () => load(true);
    window.addEventListener('admin:pending', h);
    return () => window.removeEventListener('admin:pending', h);
  }, [load]);
  const total = data ? (data.payDue.length ? 1 : 0) + data.review.count + data.reservations.count + data.accounts.count + data.leads.count : 0;
  return { data, total, reload: () => load(true) };
}
