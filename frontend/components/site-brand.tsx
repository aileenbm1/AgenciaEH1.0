import Link from 'next/link';
import { SiteConfig } from '@/lib/site';
import { BrandLogo } from './brand-logo';

/** Logotipo del sitio: imagen subida por el administrador, iniciales o el logotipo de Mi Casa. */
export function SiteBrand({ brand, href = '/' }: { brand: SiteConfig['brand']; href?: string }) {
  const name = brand.name || 'Mi Casa';
  // "Mi Casa" se escribe con "Casa" en cursiva dorada, como en el logotipo.
  const isDefault = name.trim().toLowerCase() === 'mi casa';
  return <Link className="brand" href={href} aria-label={`${name} · inicio`}>
    {brand.logoUrl ? <img className="brand-logo" src={brand.logoUrl} alt={name} /> : brand.mark ? <span className="brand-mark">{brand.mark}</span> : <BrandLogo />}
    {!(brand.logoUrl && brand.logoOnly) && <span><b>{isDefault ? <>Mi <em>Casa</em></> : name}</b>{brand.tagline && <small>{brand.tagline}</small>}</span>}
  </Link>;
}
