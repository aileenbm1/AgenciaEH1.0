"use client";
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Dentro del panel de administración no se muestran el encabezado ni el pie del sitio público (el panel tiene su propio menú). */
export default function HideOnAdmin({ children }: { children: ReactNode }) {
  const p = usePathname() || '';
  if (p.startsWith('/panel/admin') && !p.startsWith('/panel/admin/sitio')) return null;
  return <>{children}</>;
}
