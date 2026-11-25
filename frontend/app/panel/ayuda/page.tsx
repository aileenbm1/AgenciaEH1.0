"use client";
import Link from 'next/link';
import ProtectedPanel from '@/components/protected-panel';
import PublisherShell from '@/components/publisher/publisher-shell';
import { PublishFlow } from '@/components/panel-shell';

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER']}>{user => <PublisherShell user={user} active="ayuda">
    <div className="adm-top"><div><h1>Cómo publicar</h1><p className="adm-date">Todo lo que necesitas para publicar y recibir reservas en Mi Casa.</p></div></div>
    <PublishFlow />
    <section className="adm-sec"><div className="adm-card adm-pad pub-help">
      <h3>Consejos para que tu propiedad se apruebe rápido</h3>
      <ul><li>Sube al menos <b>3 fotos reales</b> y con buena luz: fachada, interior y baños.</li><li>Escribe una <b>descripción clara</b>: zona, metros, recámaras, qué incluye.</li><li>Revisa que el <b>precio</b> sea correcto (por mes si es renta).</li><li>Marca la ubicación en el mapa; puedes mostrar solo la zona aproximada.</li></ul>
      <h3>Reservas en línea</h3>
      <ul><li>En <Link className="inline-link" href="/panel/agente/propiedades">Mis propiedades</Link>, toca <b>⋯ → Reservas y calendario</b> para activar la renta por noche, semana o mes.</li><li>Captura tus <Link className="inline-link" href="/panel/datos-de-pago">datos para recibir pagos</Link>: el huésped los ve en su reserva y puede subir su comprobante.</li><li>Cuando llegue un comprobante, lo verás en tu Inicio como <b>“Comprobante por revisar”</b>.</li></ul>
      <h3>¿Dudas?</h3><p className="muted">Escríbele al administrador de Mi Casa; las cuentas nuevas y las membresías las gestiona él.</p>
    </div></section>
  </PublisherShell>}</ProtectedPanel>;
}
