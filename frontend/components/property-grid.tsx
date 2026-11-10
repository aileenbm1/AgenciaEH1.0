import { Property } from '@/lib/data';
import { PropertyCard } from '@/components/property-card';

export function PropertyGrid({ items, view = 'grid' }: { items: Property[]; view?: 'grid' | 'list' }) {
  return <div className={`property-grid${view === 'list' ? ' is-list' : ''}`}>{items.map(p => <PropertyCard key={p.id} p={p} />)}</div>;
}
