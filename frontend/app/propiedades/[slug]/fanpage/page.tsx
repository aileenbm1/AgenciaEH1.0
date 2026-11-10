import { notFound } from 'next/navigation';
import { getJson } from '@/lib/api-transport';
import { getPublicProperty } from '@/lib/properties';
import { FanpageData } from '@/lib/fanpage';
import { mxn } from '@/lib/data';
import FanpageView from '@/components/fanpage-view';
export const dynamic = 'force-dynamic';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const p = await getPublicProperty(slug);
  if (!p) return {};
  const img = p.images?.[0]?.url;
  const description = `${mxn(Number(p.price))}${p.operation === 'RENT' ? ' / mes' : ''} · ${p.neighborhood ? `${p.neighborhood}, ` : ''}${p.municipality}. ${(p.description || '').slice(0, 120)}`;
  return { title: `${p.title} · Agencia EH`, description, openGraph: { title: p.title, description, type: 'website', images: img ? [{ url: img }] : [] } };
}

/** Fanpage pública de la propiedad: diseño por bloques (o el automático), con estadísticas y origen UTM. */
export default async function FanpagePage({ params, searchParams }: Params) {
  const { slug } = await params;
  const sp = await searchParams;
  const one = (k: string) => { const v = sp[k]; return (Array.isArray(v) ? v[0] : v)?.slice(0, 80); };
  const [p, fp] = await Promise.all([getPublicProperty(slug), getJson<FanpageData>(`fanpages/public/${encodeURIComponent(slug)}`).then(r => r.data)]);
  if (!p || !fp) notFound();
  return <main className="fanpage-wrap">
    <FanpageView property={p} theme={fp.theme} blocks={fp.blocks} campaign={one('utm_campaign')} source={one('utm_source')?.toLowerCase().replace(/[^a-z0-9_.-]/g, '')} />
  </main>;
}
