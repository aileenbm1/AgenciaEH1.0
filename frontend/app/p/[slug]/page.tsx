import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import SiteBlocks from '@/components/site-blocks';
import { getSite } from '@/lib/site-server';
import { featuredFor } from '@/lib/site-featured';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = (await getSite()).extra.find(p => p.slug === slug);
  return page ? { title: page.title, description: page.description || undefined } : { title: 'Página no encontrada' };
}

/** Páginas extra creadas por el administrador (Nosotros, Aviso de privacidad, etc.). */
export default async function ExtraPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getSite();
  const page = site.extra.find(p => p.slug === slug);
  if (!page) notFound();
  return <main className="site-page"><SiteBlocks blocks={page.blocks} site={site} featured={await featuredFor(page.blocks)} /></main>;
}
