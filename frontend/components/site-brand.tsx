import Link from 'next/link';
import { SiteConfig } from '@/lib/site';

/** Logotipo del sitio: imagen subida por el administrador o la marca de texto. */
export function SiteBrand({ brand, href = '/' }: { brand: SiteConfig['brand']; href?: string }) {
  const name = brand.name || 'AGENCIA EH';
  return <Link className="brand" href={href} aria-label={`${name} · inicio`}>
    {brand.logoUrl ? <img className="brand-logo" src={brand.logoUrl} alt={name} /> : <span className="brand-mark">{brand.mark || 'EH'}</span>}
    {!(brand.logoUrl && brand.logoOnly) && <span><b>{name}</b>{brand.tagline && <small>{brand.tagline}</small>}</span>}
  </Link>;
}
