import Link from 'next/link';
import { ROLES, PROPERTY_STATUS } from '@/lib/roles';

export const metadata = { title: 'Cómo funciona | Agencia EH' };

export default function HowItWorks() {
  const roles = Object.values(ROLES);
  return <main className="page-wrap">
    <div className="page-heading">
      <span className="eyebrow">CÓMO FUNCIONA</span>
      <h1>Una plataforma, cuatro tipos de cuenta</h1>
      <p>Quien anuncia registra la propiedad, Agencia EH la revisa y, al aprobarla, cualquier persona puede encontrarla y contactar al asesor.</p>
    </div>

    <section className="flow big">
      <h2 className="panel-subtitle">El recorrido de una propiedad</h2>
      <ol className="flow-steps">
        <li><span className="step-num">1</span><div><b>El agente o agencia la registra</b><p>Captura datos y fotos. Queda como <i className="status-pill neutral">{PROPERTY_STATUS.DRAFT.label}</i></p></div></li>
        <li><span className="step-num">2</span><div><b>La envía a revisión</b><p>Pasa a <i className="status-pill warn">{PROPERTY_STATUS.REVIEW.label}</i> y deja de poder editarse mientras tanto.</p></div></li>
        <li><span className="step-num">3</span><div><b>Un administrador decide</b><p>La aprueba → <i className="status-pill ok">{PROPERTY_STATUS.PUBLISHED.label}</i>, o la rechaza → <i className="status-pill bad">{PROPERTY_STATUS.REJECTED.label}</i> para que se corrija.</p></div></li>
        <li><span className="step-num">4</span><div><b>El comprador la encuentra</b><p>Aparece en el catálogo; el interesado contacta al asesor por WhatsApp o correo.</p></div></li>
      </ol>
    </section>

    <h2 className="panel-subtitle">¿Qué puede hacer cada cuenta?</h2>
    <div className="role-grid">
      {roles.map(r => <article key={r.id} className="role-card">
        <span className="role-badge">{r.label}</span>
        <p className="role-who">{r.who}</p>
        <p>{r.summary}</p>
        <h4>Puede</h4>
        <ul>{r.can.map(c => <li key={c}>{c}</li>)}</ul>
        {r.soon?.length ? <><h4>Próximamente</h4><ul className="soon">{r.soon.map(c => <li key={c}>{c}</li>)}</ul></> : null}
        {r.publicSignup
          ? <Link className="button button-outline full" href={`/acceso?registro=1&rol=${r.id}`}>Crear cuenta de {r.label.toLowerCase()}</Link>
          : <p className="muted">Cuenta interna: la crea el equipo de Agencia EH.</p>}
      </article>)}
    </div>

    <section className="faq">
      <h2 className="panel-subtitle">Preguntas frecuentes</h2>
      <details><summary>¿Cuál es la diferencia entre agente y agencia?</summary><p>Ambos publican con el mismo flujo. La agencia representa a una inmobiliaria y, próximamente, podrá invitar a sus agentes y ver los prospectos de todo el equipo. Si trabajas solo o eres dueño de la propiedad, elige agente.</p></details>
      <details><summary>¿Por qué mi propiedad no aparece en el catálogo?</summary><p>Solo se muestran las propiedades aprobadas. Revisa su estado en “Mis propiedades”: si está en borrador, envíala a revisión; si fue rechazada, corrígela y reenvíala.</p></details>
      <details><summary>¿Necesito cuenta para buscar propiedades?</summary><p>No. El catálogo y el contacto con asesores son públicos. La cuenta de comprador servirá para guardar favoritos y búsquedas.</p></details>
      <details><summary>¿Cómo se pagan las membresías?</summary><p>No hay cobro en línea: se pagan en efectivo o por transferencia y el administrador las registra.</p></details>
    </section>
  </main>;
}
