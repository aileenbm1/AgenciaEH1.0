import Link from 'next/link';
export const metadata = { title: 'Sin conexión · Agencia EH' };

/** Página que muestra la app instalada cuando no hay internet. */
export default function Offline() {
  return <main className="page-wrap offline-page">
    <span className="eyebrow">SIN CONEXIÓN</span>
    <h1>No hay conexión a internet</h1>
    <p>Revisa tu conexión y vuelve a intentarlo. Las páginas que ya visitaste pueden seguir disponibles.</p>
    <Link className="button button-navy" href="/">Reintentar</Link>
  </main>;
}
