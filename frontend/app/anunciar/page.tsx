import SiteBlocks from '@/components/site-blocks';
import { getSite } from '@/lib/site-server';
import { featuredFor } from '@/lib/site-featured';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anuncia con Mi Casa', description: 'Solicita tu cuenta de agente, agencia o desarrolladora.' };

/** Las cuentas profesionales las crea el administrador: aquí se solicitan. El contenido lo edita el admin. */
export default async function Anunciar() {
  const site = await getSite();
  const blocks = site.pages.anunciar || [];
  return <main className="site-page"><SiteBlocks blocks={blocks} site={site} featured={await featuredFor(blocks)} /></main>;
}
