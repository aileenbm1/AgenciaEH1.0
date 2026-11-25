"use client";
import { useCallback, useEffect, useState } from 'react';
import ProtectedPanel from '@/components/protected-panel';
import PreviewFrame from '@/components/preview-frame';
import SiteBlocks from '@/components/site-blocks';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { authJson } from '@/lib/auth';
import { ApiProperty, toCard } from '@/lib/properties';
import { SiteBlock, SiteConfig, SitePageKey, themeCss, withDefaults } from '@/lib/site';

type Featured = Record<string, { items: ReturnType<typeof toCard>[]; total: number }>;
type EditorState = { draft: Partial<SiteConfig> | null; hasPublished: boolean; unpublishedChanges: boolean };

/** Vista previa del sitio completo con el borrador del editor (encabezado, página y pie). Solo el administrador. */
function SitePreview() {
  const [st, setSt] = useState<EditorState | null>(null);
  const [page, setPage] = useState('home');
  const [featured, setFeatured] = useState<Featured>({});
  const [error, setError] = useState('');
  const load = useCallback(() => authJson<EditorState>('/admin/site').then(setSt).catch(e => setError(e instanceof Error ? e.message : 'No se pudo abrir la vista previa.')), []);
  useEffect(() => { setPage(new URLSearchParams(window.location.search).get('pagina') || 'home'); load(); }, [load]);
  const cfg = st ? withDefaults(st.draft) : null;
  const blocks: SiteBlock[] = !cfg ? [] : page.startsWith('x') ? cfg.extra[Number(page.slice(1))]?.blocks || [] : cfg.pages[page as SitePageKey] || [];
  const featKey = JSON.stringify(blocks.filter(b => b.type === 'featured').map(b => [b.id, b.operation, b.count]));
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: Featured = {};
      for (const b of blocks.filter(x => x.type === 'featured')) {
        try { const r = await fetch(`/api/v1/properties?take=${Number(b.count) || 4}&sort=recent${b.operation ? `&operation=${b.operation}` : ''}`); const d = await r.json(); out[b.id] = { items: (d.items as ApiProperty[]).map(toCard), total: d.total }; } catch { /* sin muestra */ }
      }
      if (alive) setFeatured(out);
    })();
    return () => { alive = false; };
  }, [featKey]); // eslint-disable-line react-hooks/exhaustive-deps
  if (error) return <main className="page-wrap"><p className="notice">{error}</p></main>;
  if (!st || !cfg) return <main className="page-wrap"><p className="muted">Cargando vista previa…</p></main>;
  const name = page === 'home' ? 'Inicio' : page === 'anunciar' ? 'Anunciar' : cfg.extra[Number(page.slice(1))]?.title || 'Página';
  return <PreviewFrame title={`Sitio · ${name}`} label={st.unpublishedChanges ? 'Cambios aún no publicados' : 'Sin cambios pendientes'} editHref="/panel/admin/sitio" onReload={load}
    status={st.unpublishedChanges ? `Página “${name}” con el borrador del editor. El público sigue viendo la versión anterior.` : `Página “${name}”. No hay cambios pendientes: así se ve hoy.`}
    publish={st.unpublishedChanges || !st.hasPublished ? { label: 'Publicar', run: async () => { await authJson('/admin/site/publish', { method: 'POST', body: JSON.stringify({ config: cfg }) }); return '¡Listo! Los cambios ya se ven en el sitio público.'; } } : null}>
    <style>{themeCss(cfg.theme)}</style>
    <div className={cfg.theme.pattern !== false ? 'mc-pattern pv-site' : 'pv-site'}>
      <SiteHeader site={cfg} />
      <main><SiteBlocks blocks={blocks} site={cfg} featured={featured} /></main>
      <SiteFooter site={cfg} />
    </div>
  </PreviewFrame>;
}

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}><SitePreview /></ProtectedPanel>;
}
