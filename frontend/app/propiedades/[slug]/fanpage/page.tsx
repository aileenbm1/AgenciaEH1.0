import { getJson } from '@/lib/api-transport';
import { getPublicProperty } from '@/lib/properties';
import { FanpageData } from '@/lib/fanpage';
import { priceText } from '@/lib/data';
import FanpageView from '@/components/fanpage-view';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const p = await getPublicProperty(slug);
  if (!p) return {};
  const img = p.images?.[0]?.url;
  const description = `${priceText(Number(p.price), p.priceMode, p.operation === 'RENT' ? ' / mes' : '')} · ${p.neighborhood ? `${p.neighborhood}, ` : ''}${p.municipality}. ${(p.description || '').slice(0, 120)}`;
  return { title: `${p.title} · Mi Casa`, description, openGraph: { title: p.title, description, type: 'website', images: img ? [{ url: img }] : [] } };
}

/** Fanpage pública de la propiedad: diseño por bloques (o el automático), con estadísticas y origen UTM. */
export default async function FanpagePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v)?.slice(0, 80); };
  const [p, fp] = await Promise.all([getPublicProperty(slug), getJson<FanpageData>(`fanpages/public/${encodeURIComponent(slug)}`).then(r => r.data)]);
  // Si la propiedad aún no está publicada (borrador, en revisión o con cambios pendientes) se explica en lugar de un 404 seco.
  if (!p || !fp) return <main className="page-wrap fp-unpublished"><div className="adm-card adm-pad">
    <h1>Esta página todavía no está disponible</h1>
    <p className="muted">La propiedad aún no está publicada o dejó de estarlo. Su fanpage se verá aquí en cuanto el administrador de Mi Casa la apruebe.</p>
    <p className="muted">Si eres el anunciante: revisa su estado en <a className="inline-link" href="/panel/agente/propiedades">Mis propiedades</a>. Mientras tanto, en el editor de la fanpage usa el botón <b>Vista previa ↗</b> para verla completa.</p>
    <a className="button button-navy" href="/propiedades">Ver otras propiedades</a>
  </div></main>;
  return <main className="fanpage-wrap">
    <FanpageView property={p} theme={fp.theme} blocks={fp.blocks} campaign={one('utm_campaign')} source={one('utm_source')?.toLowerCase().replace(/[^a-z0-9_.-]/g, '')} />
  </main>;
}
