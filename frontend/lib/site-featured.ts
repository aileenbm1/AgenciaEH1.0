// Solo servidor: propiedades de cada bloque "Propiedades" de una página del sitio.
import { getPublicProperties, toCard } from './properties';
import { SiteBlock } from './site';

export async function featuredFor(blocks: SiteBlock[]) {
  const out: Record<string, { items: ReturnType<typeof toCard>[]; total: number }> = {};
  await Promise.all(blocks.filter(b => b.type === 'featured' && !b.hidden).map(async b => {
    const r = await getPublicProperties({ sort: 'recent', operation: b.operation || undefined }, Number(b.count) || 4);
    out[b.id] = { items: r.items.map(toCard), total: r.total };
  }));
  return out;
}
