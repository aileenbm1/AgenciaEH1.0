"use client";
import ProtectedPanel from '@/components/protected-panel';
import PublisherShell from '@/components/publisher/publisher-shell';
import PayoutForm from '@/components/payout-form';
import { refreshPublisherPending } from '@/components/publisher/use-publisher-pending';

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <PublisherShell user={user} active="pagos">
    <div className="adm-top"><div><h1>Datos para recibir pagos</h1><p className="adm-date">El huésped o comprador los ve en su reserva <b>cuando la apruebas</b>, junto con una referencia, para que te transfiera y suba su comprobante. Mi Casa no cobra en línea: el dinero llega directo a tu cuenta.</p></div></div>
    {user.role === 'AGENT' && <p className="muted">Si perteneces a una agencia y la agencia cobra por ti, puedes dejar esto vacío: se usarán los datos de tu agencia.</p>}
    <PayoutForm endpoint="/panel/payout" onSaved={refreshPublisherPending} />
  </PublisherShell>}</ProtectedPanel>;
}
