import type { UserRole } from '@/lib/auth';
export type Membership = { plan: string; periodEnd: string; active: boolean } | null;
export type AdminUser = { id: string; fullName: string; email: string; phone?: string | null; role: UserRole; isActive: boolean; emailVerified: boolean; createdAt: string; properties: number; createdBy?: string | null; approvalStatus?: 'APPROVED' | 'PENDING' | 'REJECTED'; membership: Membership };
export type Payment = { id: string; userId: string; fullName: string; email: string; plan: string; amount: number; method: 'CASH' | 'TRANSFER'; reference?: string | null; paidAt: string; periodStart: string; periodEnd: string; notes?: string | null; recordedBy: string };
export const METHOD_LABEL = { CASH: 'Efectivo', TRANSFER: 'Transferencia' } as const;
/** Fecha local AAAA-MM-DD. */
export const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); };
/** Suma meses y resta un día: inicio 2026-11-09 + 1 mes → 2026-12-08. */
export function periodEnd(start: string, months: number) {
  const [y, m, d] = start.split('-').map(Number);
  const end = new Date(Date.UTC(y, m - 1 + months, d));
  if (end.getUTCDate() !== d) end.setUTCDate(0); // 31 ene + 1 mes → fin de febrero
  end.setUTCDate(end.getUTCDate() - 1);
  return end.toISOString().slice(0, 10);
}
export const fmtDate = (iso?: string | null) => iso ? new Date(iso.length === 10 ? iso + 'T12:00:00' : iso).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
