import Link from 'next/link';
export const metadata = { title: 'Anuncia con Agencia EH', description: 'Solicita tu cuenta de agente, agencia o desarrolladora.' };

const EMAIL = process.env.CONTACT_EMAIL || 'contacto@agenciaeh.mx';
const PHONE = (process.env.CONTACT_PHONE || '').replace(/\D/g, '');
const body = encodeURIComponent('Hola, quiero una cuenta para anunciar en Agencia EH.\n\nTipo de cuenta (agente / agencia / desarrolladora):\nNombre:\nNombre de la empresa (si aplica):\nTeléfono:\nCiudad:\n');

/** Las cuentas profesionales las crea el administrador: aquí se solicitan. */
export default function Anunciar() {
  return <main className="page-wrap">
    <div className="page-heading"><span className="eyebrow">ANUNCIA CON NOSOTROS</span><h1>Solicita tu cuenta de anunciante</h1>
      <p>Las cuentas de <b>agentes, agencias y desarrolladoras</b> las crea el administrador de Agencia EH. Escríbenos con tus datos y te enviaremos un enlace para activar tu cuenta y elegir tu contraseña.</p></div>
    <ol className="flow-steps">
      <li><span className="step-num">1</span><div><b>Solicítala</b><p>Por correo{PHONE ? ' o WhatsApp' : ''} con tu nombre, tipo de cuenta y empresa.</p></div></li>
      <li><span className="step-num">2</span><div><b>La creamos</b><p>Recibes un enlace de activación por correo.</p></div></li>
      <li><span className="step-num">3</span><div><b>Publica y vende</b><p>Registra propiedades, recibe prospectos y acepta reservas en línea.</p></div></li>
    </ol>
    <div className="property-actions">
      <a className="button button-navy" href={`mailto:${EMAIL}?subject=${encodeURIComponent('Solicitud de cuenta de anunciante')}&body=${body}`}>Solicitar por correo</a>
      {PHONE && <a className="button button-outline" href={`https://wa.me/${PHONE.length === 10 ? '52' + PHONE : PHONE}?text=${body}`} target="_blank" rel="noopener noreferrer">Solicitar por WhatsApp</a>}
    </div>
    <p className="muted">¿Buscas comprar o rentar? <Link className="inline-link" href="/acceso?registro=1">Crea tu cuenta de comprador</Link> al instante.</p>
  </main>;
}
