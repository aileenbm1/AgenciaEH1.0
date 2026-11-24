import React from 'react';
import Link from 'next/link';
import { isExternal } from '@/lib/site';

/** Enlace del sitio: interno con <Link>, externo en otra pestaña. Las direcciones ya vienen validadas por la API. */
export function SiteA({ href, className, children, title }: { href: string; className?: string; children: React.ReactNode; title?: string }) {
  if (!href) return null;
  if (isExternal(href)) return <a className={className} href={href} title={title} {...(/^https?:/i.test(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>{children}</a>;
  return <Link className={className} href={href} title={title}>{children}</Link>;
}
