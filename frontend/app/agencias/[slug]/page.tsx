import { notFound } from 'next/navigation';
import { PropertyGrid } from '@/components/property-grid';
import { getJson } from '@/lib/api-transport';
import { ApiProperty, toCard } from '@/lib/properties';
export const dynamic = 'force-dynamic';

type Agency = { kind?: 'AGENCY' | 'DEVELOPER'; name: string; slug: string; description?: string | null; phone?: string | null; agents: { id: string; fullName: string }[]; properties: ApiProperty[] };
const waNumber = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `52${d}` : d; };

export default async function AgencyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: a } = await getJson<Agency>(`agencies/${encodeURIComponent(slug)}`);
  if (!a) notFound();
  return <main className="page-wrap">
    <section className="agency-hero"><span className="eyebrow light">{a.kind === 'DEVELOPER' ? 'DESARROLLADORA INMOBILIARIA' : 'AGENCIA INMOBILIARIA'}</span><h1>{a.name}</h1>
      {a.description && <p>{a.description}</p>}
      {a.phone && <a className="button button-gold" href={`https://wa.me/${waNumber(a.phone)}?text=${encodeURIComponent(`Hola, vi su perfil de ${a.name} en Agencia EH.`)}`} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>}
    </section>
    {a.agents.length > 0 && <p className="muted lead">Asesores: {a.agents.map(x => x.fullName).join(' · ')}</p>}
    <h2>{a.kind === 'DEVELOPER' ? 'Propiedades de la desarrolladora' : 'Propiedades de la agencia'}</h2>
    {a.properties.length ? <PropertyGrid items={a.properties.map(toCard)} /> : <div className="empty-start">Esta agencia aún no tiene propiedades publicadas.</div>}
  </main>;
}
