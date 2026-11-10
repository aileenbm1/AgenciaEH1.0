import Link from 'next/link';
import { notFound } from 'next/navigation';
import { PropertyGrid } from '@/components/property-grid';
import ShareButtons from '@/components/share-buttons';
import { getJson } from '@/lib/api-transport';
import { ApiProperty, toCard } from '@/lib/properties';
export const dynamic = 'force-dynamic';

type Agent = { fullName: string; slug: string; bio?: string | null; photoUrl?: string | null; phone?: string | null; since: string; agency: { name: string; slug: string } | null; stats: { active: number; closed: number }; properties: ApiProperty[] };
const waNumber = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `52${d}` : d; };

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: a } = await getJson<Agent>(`agents/${encodeURIComponent(slug)}`);
  return a ? { title: `${a.fullName} · Asesor inmobiliario · Agencia EH`, description: a.bio?.slice(0, 160) || `Propiedades de ${a.fullName} en Agencia EH.` } : {};
}

/** Perfil público del asesor (RF-11). */
export default async function AgentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { data: a } = await getJson<Agent>(`agents/${encodeURIComponent(slug)}`);
  if (!a) notFound();
  const year = new Date(a.since).getFullYear();
  return <main className="page-wrap">
    <section className="agency-hero agent-hero">
      {a.photoUrl ? <img className="agent-photo" src={a.photoUrl} alt={a.fullName} /> : <span className="agent-photo initials" aria-hidden>{a.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>}
      <div>
        <span className="eyebrow light">ASESOR INMOBILIARIO{a.agency ? <> · <Link href={`/agencias/${a.agency.slug}`}>{a.agency.name.toUpperCase()}</Link></> : null}</span>
        <h1>{a.fullName}</h1>
        {a.bio && <p>{a.bio}</p>}
        <div className="agent-stats"><span><b>{a.stats.active}</b> propiedades activas</span><span><b>{a.stats.closed}</b> rentadas o vendidas</span><span>En Agencia EH desde <b>{year}</b></span></div>
        {a.phone && <a className="button button-gold" href={`https://wa.me/${waNumber(a.phone)}?text=${encodeURIComponent(`Hola ${a.fullName.split(' ')[0]}, vi tu perfil en Agencia EH.`)}`} target="_blank" rel="noopener noreferrer">Contactar por WhatsApp</a>}
      </div>
    </section>
    <ShareButtons path={`/asesores/${a.slug}`} title={`${a.fullName} · Asesor inmobiliario`} />
    <h2>Propiedades de {a.fullName.split(' ')[0]}</h2>
    {a.properties.length ? <PropertyGrid items={a.properties.map(toCard)} /> : <div className="empty-start">Este asesor no tiene propiedades publicadas por ahora.</div>}
  </main>;
}
