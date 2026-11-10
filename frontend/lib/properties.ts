import { Property } from './data';
import { getJson } from './api-transport';
import { AVAILABILITY } from './roles';

export type ApiImage = { url: string; alt?: string | null; label?: string | null; position: number };
export type ApiProperty = {
  id: string; slug: string; title: string; description?: string | null;
  operation: 'RENT' | 'SALE' | 'BOTH'; price: string | number; rentPrice?: string | number | null;
  category?: string | null; availability?: 'AVAILABLE' | 'RESERVED' | 'RENTED' | 'SOLD'; availableFrom?: string | null;
  municipality: string; neighborhood?: string | null; propertyType: string; bedrooms?: number | null; bathrooms?: number | null;
  landArea?: string | number | null; builtArea?: string | number | null; images?: ApiImage[];
  latitude?: number | null; longitude?: number | null; showExactLocation?: boolean;
  custom?: Record<string, string>; customFields?: { key: string; label: string; type: string }[];
  owner?: { fullName: string; role: string; phone?: string | null; agency?: { name: string; slug: string } | null; agent?: { slug: string; photoUrl?: string | null } | null } | null;
};
export type PropertyPage = { items: ApiProperty[]; total: number; page: number; take: number; pages: number };

export const OPERATION_LABEL = { RENT: 'Renta', SALE: 'Venta', BOTH: 'Venta y renta' } as const;

export function toCard(p: ApiProperty): Property {
  const tag = p.availability && p.availability !== 'AVAILABLE' ? AVAILABILITY[p.availability]?.label : undefined;
  return {
    id: p.id, slug: p.slug, title: p.title, city: p.municipality, neighborhood: p.neighborhood || p.municipality,
    price: Number(p.price), rentPrice: p.rentPrice ? Number(p.rentPrice) : null, operation: OPERATION_LABEL[p.operation] || 'Venta',
    beds: p.bedrooms || 0, baths: p.bathrooms || 0, area: Number(p.builtArea || p.landArea || 0), tag,
    image: p.images?.[0]?.url || '/placeholder-property.svg',
  };
}

export async function getPublicProperties(params: Record<string, string | number | undefined> = {}, take = 12): Promise<PropertyPage> {
  const qs = new URLSearchParams({ take: String(take) });
  for (const [key, value] of Object.entries(params)) if (value !== undefined && String(value).trim() !== '') qs.set(key, String(value));
  const { data } = await getJson<PropertyPage>(`properties?${qs}`);
  return data ?? { items: [], total: 0, page: 1, take, pages: 0 };
}

export async function getPublicProperty(slug: string): Promise<ApiProperty | null> {
  const { data } = await getJson<ApiProperty>(`properties/${encodeURIComponent(slug)}`);
  return data;
}

export type CustomField = { id: string; key: string; label: string; type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'SELECT'; options: string[]; required: boolean; filterable: boolean; position: number; active: boolean };
export async function getCustomFields(): Promise<CustomField[]> {
  const { data } = await getJson<CustomField[]>('custom-fields');
  return data ?? [];
}
