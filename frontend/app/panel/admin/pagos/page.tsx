"use client";
import { useEffect, useState } from 'react';
import { BadgeDollarSign } from 'lucide-react';
import ProtectedPanel from '@/components/protected-panel';
import AdminShell from '@/components/admin/admin-shell';
import AdminPayments from '@/components/admin/admin-payments';
import AdminMetrics from '@/components/admin/admin-metrics';
import RegisterPayment from '@/components/admin/register-payment';
import PayoutForm from '@/components/payout-form';
import { refreshPending } from '@/components/admin/use-pending';
import { SessionUser } from '@/lib/auth';

function Pagos({ user }: { user: SessionUser }) {
  const [key, setKey] = useState(0); const [reg, setReg] = useState(false);
  useEffect(() => { if (new URLSearchParams(location.search).get('registrar')) setReg(true); }, []);
  return <AdminShell user={user} active="pagos">
    <div className="adm-top"><div><h1>Pagos y membresías</h1><p className="adm-date">Las membresías se pagan en efectivo o por transferencia; aquí registras cada pago y ves lo cobrado.</p></div>
      <div className="adm-top-acts"><button type="button" className="button button-navy" onClick={() => setReg(true)}><BadgeDollarSign size={16} aria-hidden /> Registrar pago</button></div></div>
    <AdminPayments refreshKey={key} />
    <AdminMetrics refreshKey={key} />
    <section className="adm-sec"><div className="adm-sec-h"><h2>Datos para cobrar membresías</h2></div>
      <p className="muted" style={{ marginTop: -6 }}>Los ven los agentes, agencias y desarrolladoras en “Mi membresía” y en los avisos de vencimiento (30 y 7 días antes).</p>
      <PayoutForm endpoint="/admin/membership-payinfo" membership /></section>
    {reg && <RegisterPayment onClose={() => setReg(false)} onSaved={() => { setKey(k => k + 1); refreshPending(); }} />}
  </AdminShell>;
}
export default function Page() { return <ProtectedPanel allowed={['ADMIN']}>{user => <Pagos user={user} />}</ProtectedPanel>; }
