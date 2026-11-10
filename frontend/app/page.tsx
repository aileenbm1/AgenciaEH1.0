import Link from "next/link";
import { PropertyGrid } from "@/components/property-grid";
import { SectionTitle } from "@/components/section-title";
import { getPublicProperties, toCard } from "@/lib/properties";
import { MUNICIPALITIES, PROPERTY_TYPES } from "@/lib/roles";

export const dynamic = "force-dynamic";

export default async function Home() {
  const featured = await getPublicProperties({ sort: "recent" }, 4);
  return <main>
    <section className="hero">
      <div className="hero-copy">
        <span className="eyebrow light">ESPACIOS QUE ENCUENTRAN SU LUGAR</span>
        <h1>Tu próximo espacio<br /><em>comienza aquí.</em></h1>
        <p>Encuentra propiedades para vivir, invertir o hacer crecer tu negocio en Guanajuato.</p>
        <div className="hero-actions">
          <Link className="button button-gold" href="/propiedades">Explorar propiedades ↗</Link>
          <Link className="text-link light-link" href="/acceso?registro=1">Crear cuenta gratis →</Link>
        </div>
      </div>
      {/* Formulario real: envía los filtros al catálogo */}
      <form className="search-panel" action="/propiedades" method="get">
        <div className="search-heading"><b>Encuentra tu próximo espacio</b><span>No necesitas cuenta para buscar</span></div>
        <div className="operation-tabs" role="radiogroup" aria-label="Operación">
          <label><input type="radio" name="operation" value="RENT" defaultChecked />Rentar</label>
          <label><input type="radio" name="operation" value="SALE" />Comprar</label>
        </div>
        <div className="search-fields">
          <label>Municipio<select name="municipality" defaultValue=""><option value="">Todos los municipios</option>{MUNICIPALITIES.map(c => <option key={c}>{c}</option>)}</select></label>
          <label>Tipo de inmueble<select name="propertyType" defaultValue=""><option value="">Cualquier tipo</option>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
          <label>Precio máximo (MXN)<input name="maxPrice" type="number" min="0" step="1000" placeholder="Sin límite" /></label>
        </div>
        <button className="button button-navy full" type="submit">Buscar propiedades</button>
      </form>
    </section>

    <section className="content-section">
      <SectionTitle eyebrow="¿QUÉ TE TRAE POR AQUÍ?" title="Elige tu camino" copy="La plataforma funciona distinto según lo que necesites." />
      <div className="path-grid">
        <Link href="/propiedades" className="path-card">
          <span className="role-badge">Busco propiedad</span>
          <h3>Comprar o rentar</h3>
          <p>Explora el catálogo y contacta al asesor sin cuenta. Crea tu cuenta gratis para rentar o apartar en línea.</p>
          <span className="path-cta">Explorar catálogo →</span>
        </Link>
        <Link href="/anunciar" className="path-card">
          <span className="role-badge">Agente / Asesor</span>
          <h3>Anunciar mis propiedades</h3>
          <p>Registra tus inmuebles; Agencia EH los revisa y, al aprobarlos, aparecen en el catálogo.</p>
          <span className="path-cta">Solicitar cuenta de agente →</span>
        </Link>
        <Link href="/anunciar" className="path-card">
          <span className="role-badge">Agencia</span>
          <h3>Publicar como inmobiliaria</h3>
          <p>Publica a nombre de tu agencia con tu equipo de asesores; el administrador crea las cuentas.</p>
          <span className="path-cta">Solicitar cuenta de agencia →</span>
        </Link>
      </div>
    </section>

    <section className="content-section soft">
      <SectionTitle eyebrow="EXPLORA GUANAJUATO" title="Encuentra el lugar ideal" copy="Propiedades en las principales ciudades del Bajío." />
      <div className="city-chips">{MUNICIPALITIES.map(c => <Link href={`/propiedades?municipality=${encodeURIComponent(c)}`} key={c}>{c} <span>↗</span></Link>)}</div>
    </section>

    <section className="content-section">
      <SectionTitle eyebrow="SELECCIÓN AGENCIA EH" title="Propiedades recientes" copy="Todas fueron revisadas por nuestro equipo antes de publicarse." />
      <PropertyGrid items={featured.items.map(toCard)} />
      {featured.total === 0 && <p className="muted">Próximamente encontrarás aquí las propiedades publicadas y aprobadas por Agencia EH.</p>}
      <div className="center"><Link className="button button-outline" href="/propiedades">Ver todas las propiedades</Link></div>
    </section>

    <section className="owner-cta">
      <div>
        <span className="eyebrow light">¿TIENES UNA PROPIEDAD?</span>
        <h2>Tu inmueble merece<br /><em>la mejor vitrina.</em></h2>
        <p>Solicita tu cuenta de agente, agencia o desarrollador: el equipo de Agencia EH la crea y te envía tu enlace de activación. Después registra tus propiedades y envíalas a revisión.</p>
      </div>
      <Link className="button button-gold" href="/anunciar">Anunciar mi propiedad ↗</Link>
    </section>
  </main>;
}
