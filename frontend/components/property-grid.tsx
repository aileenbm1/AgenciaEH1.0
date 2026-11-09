import { Property } from '@/lib/data';
import { PropertyCard } from '@/components/property-card';

export function PropertyGrid({ items }: { items: Property[] }) {
  return <div className="property-grid">{items.map(p => <PropertyCard key={p.id} p={p} />)}</div>;
}
