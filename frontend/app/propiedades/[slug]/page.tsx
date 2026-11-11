import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicProperty, OPERATION_LABEL, toCard } from '@/lib/properties';
import { AVAILABILITY } from '@/lib/roles';
import { mxn } from '@/lib/data';
import PropertyContact from '@/components/property-contact';
import PropertyTools from '@/components/property-tools';
import ShareButtons from '@/components/share-buttons';
import PropertyGallery from '@/components/property-gallery';
import ReservationWidget from '@/components/reservation-widget';
import PropertyMap from '@/components/property-map';
import FanpageEditLink from '@/components/fanpage-edit-link';
export const dynamic = 'force-dynamic';

const fmtDate = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });

export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await getPublicProperty(slug);
  if (!raw) notFound();
  const p = toCard(raw);
  const images = raw.images || [];
  const plans = images.filter(i => i.label === 'Plano');
  const av = raw.availability || 'AVAILABLE';
  const closed = av === 'RENTED' || av === 'SOLD';
  const isRent = raw.operation === 'RENT', both = raw.operation === 'BOTH';
  const showFrom = (isRent || both) && raw.availableFrom && raw.availableFrom > new Date().toISOString().slice(0, 10);
  const yes = (v: string) => v === '1' ? 'Sí' : v === '0' ? 'No' : v;
  const custom = (raw.customFields || []).filter(f => raw.custom?.[f.key]).map(f => ({ label: f.label, value: f.type === 'BOOLEAN' ? yes(raw.custom![f.key]) : raw.custom![f.key] }));
  const facts: [string, string][] = [
    ['Operación', OPERATION_LABEL[raw.operation]], ['Categoría', raw.category || '—'], ['Tipo', raw.propertyType],
    ['Recámaras', String(raw.bedrooms ?? '—')], ['Baños', String(raw.bathrooms ?? '—')],
    ['Construcción', raw.builtArea ? `${Number(raw.builtArea)} m²` : '—'], ['Terreno', raw.landArea ? `${Number(raw.landArea)} m²` : '—'],
    ...(showFrom ? [['Disponible a partir de', fmtDate(raw.availableFrom!)] as [string, string]] : []),
  ];
  return <main className="page-wrap">
    <Link href="/propiedades" className="back-link">← Volver a propiedades</Link>
    {closed && <div className="notice" role="status"><b>Esta propiedad ya no está disponible</b> ({AVAILABILITY[av].label.toLowerCase()}). <Link className="inline-link" href="/propiedades">Ver propiedades disponibles</Link>.</div>}
    <div className="detail-grid">
      <div>
        <PropertyGallery images={images} title={p.title} />
        <header className="detail-head">
          <span className="eyebrow">{OPERATION_LABEL[raw.operation].toUpperCase()} · {p.city.toUpperCase()}{av === 'RESERVED' ? ' · APARTADA' : ''}</span>
          <h1>{p.title}</h1>
          <p className="muted">{p.neighborhood}, {p.city}</p>
          <div className="property-stats large"><span>{p.beds} recámaras</span><span>{p.baths} baños</span><span>{p.area} m²</span></div>
        </header>
        <section className="detail-section"><h3>Descripción</h3><p className="detail-text">{raw.description || 'Solicita más información sobre esta propiedad.'}</p></section>
        <section className="detail-section"><h3>Ficha técnica</h3>
          <dl className="facts">{facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl></section>
        {custom.length > 0 && <section className="detail-section"><h3>Características</h3>
          <dl className="facts">{custom.map(c => <div key={c.label}><dt>{c.label}</dt><dd>{c.value}</dd></div>)}</dl></section>}
        {!closed && <ReservationWidget propertyId={raw.id} slug={raw.slug} operation={raw.operation} />}
        {raw.latitude != null && raw.longitude != null && <section className="detail-section"><h3>Ubicación</h3>
          <PropertyMap lat={Number(raw.latitude)} lng={Number(raw.longitude)} title={p.title} exact={!!raw.showExactLocation} /></section>}
        {plans.length > 0 && <section className="detail-section"><h3>Plano de planta</h3>
          {plans.map((pl, k) => <figure key={pl.url + k} className="floor-plan"><img src={pl.url} alt={`Plano de ${p.title}`} />
            <figcaption>{[raw.builtArea ? `${Number(raw.builtArea)} m² de construcción` : '', raw.landArea ? `${Number(raw.landArea)} m² de terreno` : '', raw.bedrooms ? `${raw.bedrooms} recámaras` : '', raw.bathrooms ? `${raw.bathrooms} baños` : ''].filter(Boolean).join(' · ')}</figcaption></figure>)}
        </section>}
      </div>
      <aside className="detail-aside">
        <div className="detail-price">{mxn(p.price)} <small>{isRent ? '/ mes' : 'MXN'}</small></div>
        {both && p.rentPrice ? <div className="detail-price rent">o renta {mxn(p.rentPrice)} <small>/ mes</small></div> : null}
        {av === 'RESERVED' && <p className="notice">Esta propiedad está <b>apartada</b>. Aún puedes escribir al asesor por si se libera.</p>}
        {!closed && <a className="button button-navy full" href="#reservar">{raw.operation === 'SALE' ? 'Apartar en línea' : 'Reservar en línea'}</a>}
        <PropertyTools propertyId={raw.id} slug={raw.slug} />
        {!closed && <PropertyContact propertyId={raw.id} title={p.title} owner={raw.owner} />}
        <ShareButtons path={`/propiedades/${raw.slug}`} title={p.title} />
        <p className="fp-links"><Link className="small-link" href={`/propiedades/${raw.slug}/fanpage`}>Ver fanpage de la propiedad →</Link> <FanpageEditLink propertyId={raw.id} /></p>
      </aside>
    </div>
  </main>;
}
