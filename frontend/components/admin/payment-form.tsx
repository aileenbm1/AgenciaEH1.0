"use client";
import { FormEvent, useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';
import { mxn } from '@/lib/data';
import { AdminUser, METHOD_LABEL, Payment, fmtDate, periodEnd, today } from './admin-types';

const PLANS = [
  { name: 'Mensual', months: 1 }, { name: 'Trimestral', months: 3 },
  { name: 'Semestral', months: 6 }, { name: 'Anual', months: 12 }, { name: 'Otro', months: 0 },
];

/** Membresía de un usuario: historial de pagos y formulario para registrar uno nuevo. */
export default function UserMembership({ user, onClose, onSaved }: { user: AdminUser; onClose: () => void; onSaved: () => void }) {
  const [history, setHistory] = useState<Payment[] | null>(null);
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  // Si tiene membresía vigente, el nuevo periodo empieza al día siguiente de que venza.
  const nextStart = () => {
    const end = user.membership?.periodEnd;
    if (end && end >= today()) { const d = new Date(end + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); }
    return today();
  };
  const blank = () => { const start = nextStart(); return { plan: 'Mensual', custom: '', amount: '', method: 'CASH' as 'CASH' | 'TRANSFER', reference: '', paidAt: today(), periodStart: start, periodEnd: periodEnd(start, 1), notes: '' }; };
  const [f, setF] = useState(blank);

  const load = () => authJson<{ items: Payment[] }>(`/admin/payments?userId=${user.id}`).then(r => setHistory(r.items)).catch(e => setError(e.message));
  useEffect(() => { load(); }, [user.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function setPlan(plan: string) {
    const months = PLANS.find(p => p.name === plan)?.months || 0;
    setF(x => ({ ...x, plan, periodEnd: months ? periodEnd(x.periodStart, months) : x.periodEnd }));
  }
  function setStart(periodStart: string) {
    const months = PLANS.find(p => p.name === f.plan)?.months || 0;
    setF(x => ({ ...x, periodStart, periodEnd: months && periodStart ? periodEnd(periodStart, months) : x.periodEnd }));
  }

  async function save(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setOk('');
    try {
      const plan = f.plan === 'Otro' ? f.custom.trim() : f.plan;
      await authJson('/admin/payments', { method: 'POST', body: JSON.stringify({
        userId: user.id, plan, amount: Number(f.amount), method: f.method, reference: f.reference || undefined,
        paidAt: f.paidAt, periodStart: f.periodStart, periodEnd: f.periodEnd, notes: f.notes || undefined }) });
      setOk(`Pago de ${mxn(Number(f.amount))} registrado. Membresía vigente hasta el ${fmtDate(f.periodEnd)}.`);
      await load(); onSaved();
      const start = (() => { const d = new Date(f.periodEnd + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); })();
      setF({ ...blank(), periodStart: start, periodEnd: periodEnd(start, 1) });
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo registrar el pago.'); }
    finally { setBusy(false); }
  }

  async function remove(p: Payment) {
    if (!confirm(`¿Eliminar el pago de ${mxn(p.amount)} del ${fmtDate(p.paidAt)}? Úsalo solo para corregir un error de captura.`)) return;
    try { await authJson(`/admin/payments/${p.id}`, { method: 'DELETE' }); await load(); onSaved(); }
    catch (err) { setError(err instanceof Error ? err.message : 'No se pudo eliminar.'); }
  }

  const m = user.membership;
  return <section className="dashboard-card form-card membership-card" id="membresia">
    <div className="section-heading"><h2>Membresía · {user.fullName}</h2><button type="button" className="inline-link" onClick={onClose}>Cerrar</button></div>
    <p className="muted lead">{user.email} · {m ? <>{m.active ? <i className="status-pill ok">Activa</i> : <i className="status-pill bad">Vencida</i>} {m.plan} hasta el {fmtDate(m.periodEnd)}</> : 'Sin membresía registrada.'}</p>

    <form onSubmit={save} className="property-form">
      <h3>Registrar pago</h3>
      <div className="form-grid">
        <label>Plan<select value={f.plan} onChange={e => setPlan(e.target.value)}>{PLANS.map(p => <option key={p.name}>{p.name}</option>)}</select></label>
        {f.plan === 'Otro' && <label>Nombre del plan<input required minLength={2} maxLength={60} value={f.custom} onChange={e => setF({ ...f, custom: e.target.value })} placeholder="Ej. Promoción lanzamiento" /></label>}
        <label>Monto (MXN)<input required type="number" min="1" step="0.01" value={f.amount} onChange={e => setF({ ...f, amount: e.target.value })} /></label>
        <label>Forma de pago<select value={f.method} onChange={e => setF({ ...f, method: e.target.value as 'CASH' | 'TRANSFER' })}><option value="CASH">Efectivo</option><option value="TRANSFER">Transferencia</option></select></label>
        <label>{f.method === 'TRANSFER' ? 'Referencia / folio' : 'Recibo (opcional)'}<input required={f.method === 'TRANSFER'} maxLength={120} value={f.reference} onChange={e => setF({ ...f, reference: e.target.value })} placeholder={f.method === 'TRANSFER' ? 'Ej. SPEI 123456' : 'Ej. Recibo 015'} /></label>
        <label>Fecha de pago<input required type="date" value={f.paidAt} onChange={e => setF({ ...f, paidAt: e.target.value })} /></label>
        <label>Inicio del periodo<input required type="date" value={f.periodStart} onChange={e => setStart(e.target.value)} /></label>
        <label>Fin del periodo<input required type="date" min={f.periodStart} value={f.periodEnd} onChange={e => setF({ ...f, periodEnd: e.target.value })} /></label>
      </div>
      <label>Notas (opcional)<textarea rows={2} maxLength={500} value={f.notes} onChange={e => setF({ ...f, notes: e.target.value })} /></label>
      {error && <div className="notice" role="alert">{error}</div>}
      {ok && <div className="notice ok" role="status">{ok}</div>}
      <button className="button button-navy" disabled={busy}>{busy ? 'Guardando…' : 'Registrar pago'}</button>
    </form>

    <h3>Historial de pagos</h3>
    {history === null ? <p className="muted">Cargando…</p> : history.length === 0 ? <p className="muted">Aún no hay pagos registrados.</p>
      : <div className="table-wrap"><table className="admin-table">
        <thead><tr><th>Pagado</th><th>Plan</th><th>Periodo</th><th>Monto</th><th>Forma</th><th>Registró</th><th /></tr></thead>
        <tbody>{history.map(p => <tr key={p.id}>
          <td>{fmtDate(p.paidAt)}</td><td>{p.plan}</td><td>{fmtDate(p.periodStart)} – {fmtDate(p.periodEnd)}</td>
          <td><b>{mxn(p.amount)}</b></td><td>{METHOD_LABEL[p.method]}{p.reference ? <small>{p.reference}</small> : null}</td>
          <td>{p.recordedBy}{p.notes ? <small>{p.notes}</small> : null}</td>
          <td><button type="button" className="inline-link danger-link" onClick={() => remove(p)}>Eliminar</button></td>
        </tr>)}</tbody>
      </table></div>}
  </section>;
}
