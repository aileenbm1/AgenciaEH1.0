// Etiquetas compartidas de reservas (RF-21 a RF-27).
export const RES_STATUS: Record<string, { label: string; tone: 'neutral' | 'warn' | 'ok' | 'bad' }> = {
  PENDING: { label: 'Por aprobar', tone: 'warn' },
  APPROVED: { label: 'Aprobada', tone: 'ok' },
  DEPOSIT_PAID: { label: 'Apartada (anticipo)', tone: 'ok' },
  COMPLETED: { label: 'Pagada / cerrada', tone: 'neutral' },
  REJECTED: { label: 'Rechazada', tone: 'bad' },
  CANCELLED: { label: 'Cancelada', tone: 'bad' },
};
export const RES_KIND: Record<string, string> = { NIGHTLY: 'Renta por noche', WEEKLY: 'Renta por semana', MONTHLY: 'Renta mensual', SALE: 'Apartado de compra' };
export const PAY_TYPE: Record<string, string> = { CONTADO: 'Contado', CREDITO: 'Crédito bancario', INFONAVIT: 'Infonavit', FOVISSSTE: 'Fovissste', OTRO: 'Otro' };
export const PAY_METHOD: Record<string, string> = { CASH: 'Efectivo', TRANSFER: 'Transferencia' };
export const fmtDay = (d?: string | null) => d ? new Date(d.slice(0, 10) + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '—';
export const fmtWhen = (d?: string | null) => d ? new Date(String(d).includes('T') || String(d).endsWith('Z') ? d : String(d).replace(' ', 'T') + 'Z').toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
export type ResRow = {
  id: string; kind: 'NIGHTLY' | 'WEEKLY' | 'MONTHLY' | 'SALE'; status: string; checkIn: string | null; checkOut: string | null; months: number | null; weeks: number | null; nights: number | null; guests: number | null;
  paymentType: string | null; subtotal: number; taxes: number; deposit: number; total: number;
  advanceRequired: number | null; advanceAmount: number | null; advanceMethod: string | null; advancePaidAt: string | null;
  paidAmount: number | null; paidMethod: string | null; paidAt: string | null; paymentNotes: string | null;
  appointmentAt: string | null; appointmentPlace: string | null; guestConfirmedAt: string | null; guestNote: string | null; ownerNote: string | null; createdAt: string;
  property: { id: string; title: string; slug: string; cover: string | null; municipality: string };
  guest: { id: string; fullName: string; email?: string; phone?: string }; owner: { id: string; fullName: string; email?: string; phone?: string };
};
export const resWhen = (r: ResRow) => r.kind === 'SALE' ? (r.paymentType ? `Pago: ${PAY_TYPE[r.paymentType] || r.paymentType}` : '') : r.kind === 'NIGHTLY' ? `${fmtDay(r.checkIn)} → ${fmtDay(r.checkOut)} · ${r.nights} noche(s)` : r.kind === 'WEEKLY' ? `${fmtDay(r.checkIn)} → ${fmtDay(r.checkOut)} · ${r.weeks} semana(s)` : `Desde ${fmtDay(r.checkIn)} · ${r.months} mes(es)`;
