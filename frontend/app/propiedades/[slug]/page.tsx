import { notFound } from 'next/navigation';
import { getPublicProperty } from '@/lib/properties';
import PropertyDetailView from '@/components/property-detail-view';
export const dynamic = 'force-dynamic';

export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await getPublicProperty(slug);
  if (!raw) notFound();
  return <PropertyDetailView raw={raw} />;
}
