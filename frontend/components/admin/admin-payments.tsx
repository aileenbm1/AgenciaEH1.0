"use client";
import { useEffect, useState } from 'react';
import { authJson } from '@/lib/auth';
import { mxn } from '@/lib/data';
import { METHOD_LABEL, Payment, fmtDate, today } from './admin-types';

/** Pagos registrados en un mes, con totales por forma de pago. */
export default function AdminPayments({ refreshKey }: { refreshKey: number }) {
  const [month, setMonth] = useState(today().slice(0, 7));
  const [data, setData] = useState<{ items: Payment[]; total: number } | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    setData(null);
    authJson<{ items: Payment[]; total: number }>(`/admin/payments?month=${month}`).then(setData).catch(e => setError(e.message));
  }, [month, refreshKey]);
  const sum = (m: 'CASH' | 'TRANSFER') => (data?.items || []).filter(p => p.method === m).reduce((a, p) => a + p.amount, 0);

  return <section id="pagos" className="admin-section">
    <div className="section-heading">
      <h2 className="panel-subtitle">Pagos del mes</h2>
      <label className="month-pick">Mes <input type="month" value={month} max={today().slice(0, 7)} onChange={e => e.target.value && setMonth(e.target.value)} /></label>
    </div>
    <p className="muted lead">Para registrar un pago, busca al usuario en <a href="#usuarios">Usuarios y membresías</a> y presiona "Membresía y pagos".</p>
    {error && <div className="notice" role="alert">{error}</div>}
    {!data ? <p className="muted">Cargando pagos…</p> : <>
      <div className="metric-grid compact">
        <article className="metric-card"><span>Total</span><b>{mxn(data.total)}</b><small>{data.items.length} pago(s)</small></article>
        <article className="metric-card"><span>Efectivo</span><b>{mxn(sum('CASH'))}</b></article>
        <article className="metric-card"><span>Transferencia</span><b>{mxn(sum('TRANSFER'))}</b></article>
      </div>
      {data.items.length === 0 ? <div className="empty-start">No hay pagos registrados en este mes.</div>
        : <div className="table-wrap"><table className="admin-table">
          <thead><tr><th>Pagado</th><th>Usuario</th><th>Plan</th><th>Vigencia</th><th>Monto</th><th>Forma</th><th>Registró</th></tr></thead>
          <tbody>{data.items.map(p => <tr key={p.id}>
            <td>{fmtDate(p.paidAt)}</td><td><b>{p.fullName}</b><small>{p.email}</small></td><td>{p.plan}</td>
            <td>hasta {fmtDate(p.periodEnd)}</td><td><b>{mxn(p.amount)}</b></td>
            <td>{METHOD_LABEL[p.method]}{p.reference ? <small>{p.reference}</small> : null}</td><td>{p.recordedBy}</td>
          </tr>)}</tbody>
        </table></div>}
    </>}
  </section>;
}
