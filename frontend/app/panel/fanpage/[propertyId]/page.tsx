"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedPanel from '@/components/protected-panel';
import FanpageView from '@/components/fanpage-view';
import { authJson, SessionUser } from '@/lib/auth';
import { ApiProperty } from '@/lib/properties';
import { mxn } from '@/lib/data';
import { Block, BLOCKS, BlockType, fill, FONTS, newId, PALETTES, TARGETS, Theme, TOKENS_HELP, videoUrl } from '@/lib/fanpage';

type Editor = {
  property: ApiProperty & { status: string }; images: { url: string; label?: string | null }[];
  status: 'NEW' | 'DRAFT' | 'PENDING' | 'PUBLISHED' | 'REJECTED'; reviewNote: string | null; publishedAt: string | null; hasPublished: boolean; unpublishedChanges: boolean;
  theme: Theme; blocks: Block[]; requireApproval: boolean;
};
type Template = { id: string; name: string; description?: string | null; theme: Theme; blocks: Block[] };
type Version = { id: string; note: string; createdAt: string; by?: string | null };
type Stats = { views: number; shares: number; cta: number; leads: number; channels: { kind: string; channel: string; n: number }[]; campaigns: { campaign: string; views: number; cta: number; leads: number }[]; daily: { day: string; views: number }[] };
const STATUS: Record<string, [string, string]> = { NEW: ['Automática', 'neutral'], DRAFT: ['Borrador', 'neutral'], PENDING: ['En aprobación', 'warn'], PUBLISHED: ['Publicada', 'ok'], REJECTED: ['Requiere cambios', 'bad'] };
const when = (d: string) => new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const KIND_LABEL: Record<string, string> = { VIEW: 'Visitas', SHARE: 'Compartidas', CTA: 'Clics en botones', LEAD: 'Prospectos' };

/** Campos de cada bloque: solo texto, listas, fotos del sitio, enlaces de video y opciones fijas. */
function BlockFields({ b, set, images }: { b: Block; set: (patch: Partial<Block>) => void; images: { url: string; label?: string | null }[] }) {
  const text = (k: string, label: string, max: number, area = false) => <label>{label}{area
    ? <textarea rows={4} maxLength={max} value={b[k] || ''} onChange={e => set({ [k]: e.target.value })} />
    : <input maxLength={max} value={b[k] || ''} onChange={e => set({ [k]: e.target.value })} />}</label>;
  const btn = <div className="fp-two">{text('buttonText', 'Texto del botón (vacío = sin botón)', 40)}
    <label>Acción del botón<select value={b.target || 'contact'} onChange={e => set({ target: e.target.value })}>{Object.entries(TARGETS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label></div>;
  switch (b.type) {
    case 'hero': return <>{text('title', 'Título', 140)}{text('subtitle', 'Subtítulo', 300)}
      <label>Foto de portada<select value={b.imageUrl || ''} onChange={e => set({ imageUrl: e.target.value })}><option value="">Primera foto de la propiedad</option>{images.map((i, n) => <option key={i.url} value={i.url}>Foto {n + 1}{i.label ? ` · ${i.label}` : ''}</option>)}</select></label>{btn}</>;
    case 'text': return <>{text('title', 'Título', 140)}{text('body', 'Texto (deja una línea en blanco entre párrafos)', 4000, true)}
      <label>Alineación<select value={b.align || 'left'} onChange={e => set({ align: e.target.value })}><option value="left">Izquierda</option><option value="center">Centrado</option></select></label></>;
    case 'gallery': return <>{text('title', 'Título', 140)}
      <label className="check"><input type="checkbox" checked={!!b.useProperty} onChange={e => set({ useProperty: e.target.checked })} /> Usar todas las fotos de la propiedad</label>
      {!b.useProperty && <div className="fp-pick">{images.map((i, n) => { const on = (b.images || []).includes(i.url); return <label key={i.url} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => set({ images: on ? b.images.filter((u: string) => u !== i.url) : [...(b.images || []), i.url] })} /><img src={i.url} alt={`Foto ${n + 1}`} /></label>; })}</div>}
      <label>Acomodo<select value={b.layout || 'grid'} onChange={e => set({ layout: e.target.value })}><option value="grid">Cuadrícula</option><option value="mosaic">Mosaico (primera foto grande)</option></select></label></>;
    case 'features': return <>{text('title', 'Título', 140)}
      <label className="check"><input type="checkbox" checked={b.auto !== false} onChange={e => set({ auto: e.target.checked })} /> Incluir datos de la propiedad (recámaras, baños, m², características)</label>
      <label>Puntos adicionales (uno por línea)<textarea rows={4} value={(b.items || []).join('\n')} onChange={e => set({ items: e.target.value.split('\n').slice(0, 30) })} /></label></>;
    case 'price': return <>{text('title', 'Título', 140)}{text('note', 'Nota (opcional)', 300)}
      <label className="check"><input type="checkbox" checked={b.showRent !== false} onChange={e => set({ showRent: e.target.checked })} /> Mostrar también la renta (venta y renta)</label></>;
    case 'video': return <>{text('title', 'Título', 140)}<label>Enlace de YouTube o Vimeo<input maxLength={300} value={videoUrl(b)} onChange={e => set({ url: e.target.value })} placeholder="https://youtu.be/…" /></label></>;
    case 'cta': return <>{text('title', 'Título', 140)}{text('text', 'Texto', 400)}{btn}</>;
    case 'contact': return <>{text('title', 'Título', 140)}{text('text', 'Texto', 400)}
      <label className="check"><input type="checkbox" checked={b.showWhatsapp !== false} onChange={e => set({ showWhatsapp: e.target.checked })} /> Mostrar botón de WhatsApp</label></>;
    case 'share': case 'map': return text('title', 'Título', 140);
  }
  return null;
}

function FanpageEditor({ user }: { user: SessionUser }) {
  const { propertyId } = useParams<{ propertyId: string }>();
  const [d, setD] = useState<Editor | null>(null);
  const [theme, setTheme] = useState<Theme | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string>('');
  const [tab, setTab] = useState<'design' | 'templates' | 'versions' | 'stats' | 'share'>('design');
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]); const [versions, setVersions] = useState<Version[]>([]); const [stats, setStats] = useState<Stats | null>(null);
  const [addType, setAddType] = useState<BlockType>('text');
  const [utm, setUtm] = useState({ source: 'facebook', medium: 'social', campaign: '' });
  const [tplName, setTplName] = useState('');

  const apply = (x: Editor) => { setD(x); setTheme(x.theme); setBlocks(x.blocks.map(b => ({ ...b, id: b.id || newId() }))); setDirty(false); };
  const load = useCallback(async () => { try { apply(await authJson<Editor>(`/fanpages/${propertyId}`)); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el editor.'); } }, [propertyId]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (tab === 'templates') authJson<Template[]>('/fanpages/templates').then(setTemplates).catch(() => {});
    if (tab === 'versions') authJson<Version[]>(`/fanpages/${propertyId}/versions`).then(setVersions).catch(() => {});
    if (tab === 'stats') authJson<Stats>(`/fanpages/${propertyId}/stats`).then(setStats).catch(() => {});
  }, [tab, propertyId]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);

  async function call(fn: () => Promise<Editor>, done: string) {
    setBusy(true); setError(''); setOk('');
    try { apply(await fn()); setOk(done); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar.'); } finally { setBusy(false); }
  }
  const save = () => call(() => authJson<Editor>(`/fanpages/${propertyId}`, { method: 'PUT', body: JSON.stringify({ theme, blocks }) }), 'Diseño guardado (borrador).');
  const publish = async () => {
    if (dirty) { setBusy(true); try { await authJson(`/fanpages/${propertyId}`, { method: 'PUT', body: JSON.stringify({ theme, blocks }) }); } catch (e) { setBusy(false); setError(e instanceof Error ? e.message : 'No se pudo guardar.'); return; } }
    await call(() => authJson<Editor>(`/fanpages/${propertyId}/publish`, { method: 'POST' }), d?.requireApproval ? 'Enviada a aprobación del administrador.' : '¡Fanpage publicada!');
  };

  const edit = (i: number, patch: Partial<Block>) => { setBlocks(bs => bs.map((b, j) => j === i ? { ...b, ...patch } : b)); setDirty(true); };
  const move = (i: number, dir: -1 | 1) => { setBlocks(bs => { const n = [...bs]; const j = i + dir; if (j < 0 || j >= n.length) return bs; [n[i], n[j]] = [n[j], n[i]]; return n; }); setDirty(true); };
  const remove = (i: number) => { if (confirm('¿Quitar este bloque?')) { setBlocks(bs => bs.filter((_, j) => j !== i)); setDirty(true); } };
  const add = () => { const b = { ...BLOCKS[addType].make(), id: newId() } as Block; setBlocks(bs => [...bs, b]); setOpen(b.id); setDirty(true); };
  const setT = (patch: Partial<Theme>) => { setTheme(t => ({ ...t!, ...patch })); setDirty(true); };

  const publicPath = d ? `/propiedades/${d.property.slug}/fanpage` : '';
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const utmUrl = `${origin}${publicPath}?${new URLSearchParams({ utm_source: utm.source || 'otro', utm_medium: utm.medium, ...(utm.campaign ? { utm_campaign: utm.campaign } : {}) })}`;
  const p = d?.property;
  const kitText = useMemo(() => {
    if (!p) return '';
    const facts = [p.bedrooms ? `🛏 ${p.bedrooms} recámaras` : '', p.bathrooms ? `🛁 ${p.bathrooms} baños` : '', p.builtArea ? `📐 ${Number(p.builtArea)} m² construcción` : p.landArea ? `📐 ${Number(p.landArea)} m² terreno` : ''].filter(Boolean).join('\n');
    const price = `💰 ${mxn(Number(p.price))}${p.operation === 'RENT' ? ' / mes' : ''}${p.operation === 'BOTH' && p.rentPrice ? ` · renta ${mxn(Number(p.rentPrice))} / mes` : ''}`;
    return `🏡 ${p.title}\n📍 ${p.neighborhood ? `${p.neighborhood}, ` : ''}${p.municipality}\n${price}\n${facts}\n\n${(p.description || '').slice(0, 400)}${(p.description || '').length > 400 ? '…' : ''}\n\n👉 Más información: ${utmUrl}\n\n#BienesRaíces #${p.municipality.replace(/\s/g, '')} #AgenciaEH`;
  }, [p, utmUrl]);
  async function copy(text: string, msg: string) { try { await navigator.clipboard.writeText(text); setOk(msg); } catch { setError('No se pudo copiar; selecciona el texto y cópialo manualmente.'); } }
  async function download(url: string, n: number) {
    try { const r = await fetch(url); const blob = await r.blob(); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${d!.property.slug}-${n + 1}.${(blob.type.split('/')[1] || 'jpg').replace('jpeg', 'jpg')}`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); }
    catch { window.open(url, '_blank'); }
  }

  if (!d || !theme) return <main className="page-wrap"><Link href="/panel/agente/propiedades" className="back-link">← Mis propiedades</Link><p className={error ? 'notice' : 'muted'}>{error || 'Cargando editor…'}</p></main>;
  const [stLabel, stTone] = STATUS[d.status] || STATUS.DRAFT;

  return <main className="page-wrap fp-editor-page">
    <Link href={user.role === 'ADMIN' ? '/panel/admin#fanpages' : '/panel/agente/propiedades'} className="back-link">← Volver</Link>
    <div className="page-heading panel-heading"><div>
      <span className="eyebrow">FANPAGE DE LA PROPIEDAD</span><h1>{d.property.title}</h1>
      <p><i className={`status-pill ${stTone}`}>{stLabel}</i> {d.publishedAt && <small className="muted">Publicada el {when(d.publishedAt)}</small>} {dirty ? <i className="status-pill warn">Cambios sin guardar</i> : d.unpublishedChanges && d.status !== 'PENDING' ? <i className="status-pill warn">Borrador con cambios sin publicar</i> : null}</p>
      {d.property.status !== 'PUBLISHED' && <p className="muted">La propiedad aún no está publicada: su fanpage será pública cuando el administrador apruebe la propiedad.</p>}
      {d.status === 'REJECTED' && d.reviewNote && <div className="notice">Nota del administrador: {d.reviewNote}</div>}
    </div>
      <div className="property-actions">
        <button className="button button-outline" disabled={busy || !dirty} onClick={save}>Guardar borrador</button>
        <button className="button button-navy" disabled={busy || d.status === 'PENDING' && !dirty} onClick={publish}>{d.requireApproval ? 'Enviar a aprobación' : 'Publicar'}</button>
        {d.property.status === 'PUBLISHED' && <a className="button button-outline" href={publicPath} target="_blank" rel="noopener noreferrer">Ver pública ↗</a>}
      </div>
    </div>
    <p className="muted">Editor seguro por bloques: cambias textos, fotos, colores, fuente y el orden. No se puede escribir código (HTML/CSS) — así nadie puede romper ni insertar contenido peligroso.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    <div className="auth-tabs fp-tabs" role="tablist">{([['design', 'Diseño'], ['templates', 'Plantillas'], ['versions', 'Versiones'], ['stats', 'Estadísticas'], ['share', 'Compartir y kit']] as const).map(([k, l]) =>
      <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'selected' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

    {tab === 'design' && <div className="fp-editor">
      <div className="fp-controls">
        <section className="dashboard-card"><h3>Colores y fuente</h3>
          <div className="fp-palettes">{PALETTES.map(x => <button key={x.name} type="button" title={x.name} onClick={() => setT(x.theme)} className="fp-palette"><i style={{ background: x.theme.primary }} /><i style={{ background: x.theme.accent }} /><i style={{ background: x.theme.background }} /><span>{x.name}</span></button>)}</div>
          <div className="fp-two">
            {([['primary', 'Principal'], ['accent', 'Acento'], ['background', 'Fondo'], ['text', 'Texto']] as const).map(([k, l]) => <label key={k} className="fp-color">{l}<input type="color" value={theme[k]} onChange={e => setT({ [k]: e.target.value.toUpperCase() })} /></label>)}
            <label>Fuente<select value={theme.font} onChange={e => setT({ font: e.target.value as Theme['font'] })}>{Object.entries(FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></label>
          </div>
        </section>
        <section className="dashboard-card"><h3>Bloques</h3><p className="muted small">{TOKENS_HELP}</p>
          <ol className="fp-blocks">{blocks.map((b, i) => <li key={b.id} className={b.hidden ? 'is-hidden' : ''}>
            <div className="fp-block-head">
              <button type="button" className="fp-block-name" onClick={() => setOpen(open === b.id ? '' : b.id)} aria-expanded={open === b.id}>{BLOCKS[b.type]?.label || b.type}{b.title ? ` · ${fill(String(b.title), d.property).slice(0, 30)}` : ''}</button>
              <span className="fp-block-tools">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Bajar">▼</button>
                <button type="button" onClick={() => edit(i, { hidden: !b.hidden })} aria-label={b.hidden ? 'Mostrar' : 'Ocultar'} title={b.hidden ? 'Mostrar' : 'Ocultar'}>{b.hidden ? '🙈' : '👁'}</button>
                <button type="button" onClick={() => remove(i)} aria-label="Quitar">✕</button>
              </span>
            </div>
            {open === b.id && <div className="fp-block-form">
              <BlockFields b={b} set={patch => edit(i, patch)} images={d.images} />
              <label>Fondo de la sección<select value={b.bg || 'light'} onChange={e => edit(i, { bg: e.target.value as Block['bg'] })}><option value="light">Claro (fondo)</option><option value="dark">Oscuro (color principal)</option><option value="accent">Acento</option></select></label>
            </div>}
          </li>)}</ol>
          {blocks.length < 30 && <div className="fp-add"><select value={addType} onChange={e => setAddType(e.target.value as BlockType)} aria-label="Tipo de bloque">{Object.entries(BLOCKS).map(([k, v]) => <option key={k} value={k}>{v.label} — {v.help}</option>)}</select><button type="button" className="button button-outline" onClick={add}>+ Agregar bloque</button></div>}
        </section>
      </div>
      <div className="fp-preview" aria-label="Vista previa"><div className="fp-preview-bar">Vista previa</div><FanpageView property={d.property} theme={theme} blocks={blocks} preview /></div>
    </div>}

    {tab === 'templates' && <section className="dashboard-card">
      <h3>Plantillas</h3><p className="muted">Al usar una plantilla se reemplaza el borrador actual (puedes volver atrás en “Versiones”).</p>
      <div className="fp-templates">{templates.map(t => <article key={t.id} className="fp-template">
        <div className="fp-swatch"><i style={{ background: t.theme.primary }} /><i style={{ background: t.theme.accent }} /><i style={{ background: t.theme.background }} /></div>
        <b>{t.name}</b><small className="muted">{t.description}</small><small>{t.blocks.length} bloques · {FONTS[t.theme.font]?.label}</small>
        <button className="button button-outline" disabled={busy} onClick={() => confirm(`¿Usar la plantilla "${t.name}"? Se reemplaza el borrador.`) && call(() => authJson<Editor>(`/fanpages/${propertyId}/template/${t.id}`, { method: 'POST' }), `Plantilla "${t.name}" aplicada. Revísala y publícala.`).then(() => setTab('design'))}>Usar plantilla</button>
      </article>)}</div>
      {user.role === 'ADMIN' && <form className="fp-add" onSubmit={async e => { e.preventDefault(); try { await authJson('/admin/fanpages/templates', { method: 'POST', body: JSON.stringify({ name: tplName, theme, blocks }) }); setTplName(''); setOk('Plantilla guardada.'); setTemplates(await authJson<Template[]>('/fanpages/templates')); } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo guardar.'); } }}>
        <input required minLength={2} maxLength={80} placeholder="Nombre de la nueva plantilla" value={tplName} onChange={e => setTplName(e.target.value)} /><button className="button button-navy">Guardar diseño actual como plantilla</button></form>}
    </section>}

    {tab === 'versions' && <section className="dashboard-card"><h3>Historial de versiones</h3>
      <p className="muted">Se guardan las últimas 30. “Restaurar” copia esa versión al borrador; después publícala.</p>
      {versions.length === 0 ? <p className="muted">Aún no hay versiones guardadas.</p> : <ul className="doc-list">{versions.map(v => <li key={v.id}><b>{when(v.createdAt)}</b> <span>{v.note}</span> <small className="muted">{v.by || ''}</small>
        <button className="inline-link" disabled={busy} onClick={() => confirm('¿Restaurar esta versión en el borrador?') && call(() => authJson<Editor>(`/fanpages/${propertyId}/versions/${v.id}/restore`, { method: 'POST' }), 'Versión restaurada en el borrador.').then(() => setTab('design'))}>Restaurar</button></li>)}</ul>}
      {d.hasPublished && <p><button className="button button-ghost" disabled={busy} onClick={() => confirm('¿Quitar el diseño publicado? La fanpage vuelve al diseño automático.') && call(() => authJson<Editor>(`/fanpages/${propertyId}/unpublish`, { method: 'POST' }), 'Se quitó el diseño publicado.')}>Volver al diseño automático</button></p>}
    </section>}

    {tab === 'stats' && <section className="dashboard-card"><h3>Estadísticas de la fanpage</h3>
      {!stats ? <p className="muted">Cargando…</p> : <>
        <div className="metric-grid">{([['Visitas', stats.views], ['Compartidas', stats.shares], ['Clics en botones', stats.cta], ['Prospectos', stats.leads]] as const).map(([l, v]) => <div className="metric-card" key={l}><span>{l}</span><b>{v}</b></div>)}</div>
        {stats.daily.length > 0 && <><h4>Visitas de los últimos 30 días</h4><div className="fp-bars">{stats.daily.map(x => <span key={x.day} title={`${x.day}: ${x.views}`} style={{ height: `${Math.max(6, (x.views / Math.max(...stats.daily.map(y => y.views))) * 100)}%` }} />)}</div></>}
        <div className="fp-two"><div><h4>Por canal</h4>{stats.channels.length ? <table className="fp-table"><tbody>{stats.channels.map(c => <tr key={c.kind + c.channel}><td>{KIND_LABEL[c.kind] || c.kind}</td><td>{c.channel}</td><td>{c.n}</td></tr>)}</tbody></table> : <p className="muted">Sin datos aún.</p>}</div>
          <div><h4>Por campaña (UTM)</h4>{stats.campaigns.length ? <table className="fp-table"><thead><tr><th>Campaña</th><th>Visitas</th><th>Clics</th><th>Prospectos</th></tr></thead><tbody>{stats.campaigns.map(c => <tr key={c.campaign}><td>{c.campaign}</td><td>{c.views}</td><td>{c.cta}</td><td>{c.leads}</td></tr>)}</tbody></table> : <p className="muted">Crea enlaces con campaña en “Compartir y kit”.</p>}</div></div>
      </>}
    </section>}

    {tab === 'share' && <div className="fp-two">
      <section className="dashboard-card"><h3>Enlace con campaña (UTM)</h3>
        <p className="muted">Usa un enlace distinto por red o campaña para saber de dónde llegan visitas y prospectos.</p>
        <div className="fp-two">
          <label>Red / origen<select value={utm.source} onChange={e => setUtm({ ...utm, source: e.target.value })}>{['facebook', 'instagram', 'whatsapp', 'tiktok', 'email', 'google', 'otro'].map(x => <option key={x}>{x}</option>)}</select></label>
          <label>Medio<select value={utm.medium} onChange={e => setUtm({ ...utm, medium: e.target.value })}><option value="social">Publicación orgánica</option><option value="paid">Anuncio pagado</option><option value="email">Correo</option><option value="message">Mensaje directo</option></select></label>
        </div>
        <label>Nombre de la campaña<input maxLength={60} value={utm.campaign} onChange={e => setUtm({ ...utm, campaign: e.target.value.replace(/[^\w-]/g, '-').toLowerCase() })} placeholder="ej. lanzamiento-noviembre" /></label>
        <div className="fp-url"><code>{utmUrl}</code><button className="button button-outline" onClick={() => copy(utmUrl, 'Enlace copiado.')}>Copiar</button></div>
        {d.property.status !== 'PUBLISHED' && <p className="notice">La propiedad aún no está publicada; el enlace funcionará cuando se apruebe.</p>}
      </section>
      <section className="dashboard-card"><h3>Kit para redes</h3>
        <p className="muted">Texto listo para pegar en Facebook, Instagram o WhatsApp (incluye el enlace con campaña) y las fotos para subirlas a mano.</p>
        <textarea className="fp-kit" rows={12} readOnly value={kitText} onFocus={e => e.target.select()} aria-label="Texto para redes" />
        <button className="button button-navy" onClick={() => copy(kitText, 'Texto copiado. Pégalo en tu publicación.')}>Copiar texto</button>
        <h4>Fotos</h4>
        <div className="fp-pick">{d.images.map((i, n) => <button key={i.url} type="button" className="fp-dl" onClick={() => download(i.url, n)} title="Descargar"><img src={i.url} alt={`Foto ${n + 1}`} /><span>⬇ Descargar</span></button>)}</div>
        {d.images.length > 1 && <button className="button button-outline" onClick={async () => { for (let n = 0; n < d.images.length; n++) { await download(d.images[n].url, n); await new Promise(r => setTimeout(r, 400)); } }}>Descargar todas</button>}
      </section>
    </div>}
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{user => <FanpageEditor user={user} />}</ProtectedPanel>;
}
