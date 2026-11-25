"use client";
import { useEffect, useState } from 'react';
import ProtectedPanel from '@/components/protected-panel';
import PublisherShell from '@/components/publisher/publisher-shell';
import { authJson, SessionUser } from '@/lib/auth';
import { mxn } from '@/lib/data';

type M = { status: 'none' | 'active' | 'expiring' | 'expired'; plan: string | null; periodEnd: string | null; daysLeft: number | null;
  history: { plan: string; amount: number; method: string; paidAt: string; periodStart: string; periodEnd: string }[];
  payInfo: { bank: string | null; clabe: string | null; holder: string | null; notes: string | null; amount: string | null; whatsapp: string | null } };
const day = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });

function Membership({ user }: { user: SessionUser }) {
  const [m, setM] = useState<M | null>(null); const [err, setErr] = useState('');
  useEffect(() => { authJson<M>('/panel/membership').then(setM).catch(e => setErr(e.message)); }, []);
  const tone = m?.status === 'active' ? 'ok' : m?.status === 'expiring' ? 'warn' : 'bad';
  const wa = m?.payInfo.whatsapp ? m.payInfo.whatsapp.replace(/\D/g, '') : '';
  return <PublisherShell user={user} active="membresia">
    <div className="adm-top"><div><h1>Mi membresía</h1><p className="adm-date">Con tu membresía activa tus propiedades aparecen en el catálogo y puedes recibir reservas.</p></div></div>
    {err && <div className="notice">{err}</div>}
    {!m ? <p className="muted">Cargando…</p> : <>
      <div className={`pub-member ${tone}`}>
        <b>{m.status === 'none' ? 'Aún no tienes membresía registrada' : m.status === 'expired' ? 'Tu membresía venció' : m.status === 'expiring' ? `Vence en ${m.daysLeft} día${m.daysLeft === 1 ? '' : 's'}` : 'Membresía activa'}</b>
        <span>{m.periodEnd ? `${m.status === 'expired' ? 'Venció' : 'Vence'} el ${day(m.periodEnd)}${m.plan ? ` · Plan ${m.plan.toLowerCase()}` : ''}` : 'El administrador la registra cuando recibe tu pago.'}</span>
        {m.status !== 'none' && m.status !== 'expired' && m.daysLeft !== null && <small>Te avisaremos por correo 30 y 7 días antes de que venza.</small>}
      </div>
      <section className="adm-sec"><div className="adm-sec-h"><h2>Cómo pagar o renovar</h2></div>
        <div className="adm-card adm-pad pub-paybox">
          {m.payInfo.amount && <p><b>Precio:</b> {m.payInfo.amount}</p>}
          {m.payInfo.clabe ? <dl><div><dt>Banco</dt><dd>{m.payInfo.bank || '—'}</dd></div><div><dt>CLABE</dt><dd className="mono">{m.payInfo.clabe}</dd></div><div><dt>A nombre de</dt><dd>{m.payInfo.holder || '—'}</dd></div><div><dt>Concepto</dt><dd>Membresía · {user.fullName}</dd></div></dl>
            : <p className="muted">El administrador aún no ha capturado los datos bancarios. Escríbele para acordar el pago (transferencia o efectivo).</p>}
          {m.payInfo.notes && <p className="muted">{m.payInfo.notes}</p>}
          {wa && <a className="button button-navy" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${wa.length === 10 ? '52' + wa : wa}?text=${encodeURIComponent(`Hola, soy ${user.fullName}. Te envío el comprobante de pago de mi membresía de Mi Casa.`)}`}>Enviar comprobante por WhatsApp</a>}
        </div></section>
      {m.history.length > 0 && <section className="adm-sec"><div className="adm-sec-h"><h2>Pagos registrados</h2></div>
        <div className="adm-card adm-table-wrap"><table className="adm-table"><thead><tr><th>Pagado</th><th>Plan</th><th>Vigencia</th><th>Monto</th></tr></thead>
          <tbody>{m.history.map((h, i) => <tr key={i}><td>{day(h.paidAt)}</td><td>{h.plan}</td><td>{day(h.periodStart)} – {day(h.periodEnd)}</td><td><b>{mxn(h.amount)}</b> <small className="muted">{h.method === 'CASH' ? 'Efectivo' : 'Transferencia'}</small></td></tr>)}</tbody></table></div></section>}
    </>}
  </PublisherShell>;
}
export default function Page() { return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <Membership user={user} />}</ProtectedPanel>; }
