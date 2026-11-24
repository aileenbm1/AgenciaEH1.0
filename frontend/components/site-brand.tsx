import Link from 'next/link';
import { SiteConfig } from '@/lib/site';
import { BrandLogo } from './brand-logo';

/**
 * Logotipo del sitio: imagen subida por el administrador, iniciales o, si no hay ninguna,
 * el logotipo de Mi Casa (con el nombre y la frase del sitio).
 */
export function SiteBrand({ brand, href = '/', full = false }: { brand: SiteConfig['brand']; href?: string; full?: boolean }) {
  const name = brand.name || 'Mi Casa';
  if (!brand.logoUrl && !brand.mark) return <Link className="brand brand-has-lockup" href={href} aria-label={`${name} · inicio`}>
    <BrandLogo name={name} tagline={brand.tagline} variant={full ? 'full' : 'compact'} />
  </Link>;
  return <Link className="brand" href={href} aria-label={`${name} · inicio`}>
    {brand.logoUrl ? <img className="brand-logo" src={brand.logoUrl} alt={name} /> : <span className="brand-mark">{brand.mark}</span>}
    {!(brand.logoUrl && brand.logoOnly) && <span><b>{name}</b>{brand.tagline && <small>{brand.tagline}</small>}</span>}
  </Link>;
}
