"use client";
import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Dentro del panel de administración no se muestran el encabezado ni el pie del sitio público (el panel tiene su propio menú). */
export default function HideOnAdmin({ children }: { children: ReactNode }) {
  const p = usePathname() || '';
  if (p.startsWith('/panel/admin')) return null;
  // Vista previa del sitio: dibuja su propio encabezado y pie con el borrador.
  if (p.startsWith('/vista-previa/sitio')) return null;
  // Paneles de agentes, agencias y desarrolladoras (tienen su propio menú).
  if (/^\/panel\/(agente|agencia|desarrollador|perfil-publico|estadisticas|membresia|datos-de-pago|equipo|ayuda)(\/|$)/.test(p)) return null;
  return <>{children}</>;
}
