"use client";
import { ChangeEvent, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import ProtectedPanel from '@/components/protected-panel';
import SiteBlocks from '@/components/site-blocks';
import { SiteBrand } from '@/components/site-brand';
import { authJson, uploadImage } from '@/lib/auth';
import { Property } from '@/lib/data';
import { ApiProperty, toCard } from '@/lib/properties';
import {
  BG_LABEL, DEFAULT_SITE, ExtraPage, FooterColumn, newSiteId, PAGE_LABEL, SITE_BLOCKS, SITE_FONTS, SITE_PALETTES, SiteBg, SiteBlock, SiteBlockType,
  SiteConfig, SiteLink, SitePageKey, Social, SOCIAL_LABEL, themeCss, videoUrlOf, withDefaults,
} from '@/lib/site';

type EditorState = { draft: Partial<SiteConfig> | null; published: SiteConfig | null; hasPublished: boolean; publishedAt: string | null; updatedAt: string | null; unpublishedChanges: boolean };
type Version = { id: string; note: string; createdAt: string; by?: string | null };
type Featured = Record<string, { items: Property[]; total: number }>;
const when = (d: string) => new Date(d).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' });
const MAX_BLOCKS = 30;
const SUGGESTED_LINKS = ['/', '/propiedades', '/propiedades?operation=RENT', '/propiedades?operation=SALE', '/comparar', '/anunciar', '/acceso', '/acceso?registro=1', '/agencias', '/asesores'];

/** Reduce la foto en el navegador antes de subirla (lado mayor 1800 px, JPEG). */
async function shrink(file: File, side = 1800): Promise<Blob> {
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale); canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext('2d'); if (!ctx) return file;
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', 0.85));
  return blob && blob.size < file.size ? blob : file;
}

/** Botón para subir una foto al sitio (se guarda en las fotos del sitio, nunca una URL externa). */
function Upload({ label, onDone, multiple = false, onError }: { label: string; onDone: (urls: string[]) => void; multiple?: boolean; onError: (m: string) => void }) {
  const ref = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState('');
  async function pick(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 12); e.target.value = ''; if (!files.length) return;
    const urls: string[] = [];
    try { for (let i = 0; i < files.length; i++) { setBusy(`Subiendo ${i + 1} de ${files.length}…`); urls.push(await uploadImage(await shrink(files[i]), files[i].name)); } onDone(urls); }
    catch (x) { onError(x instanceof Error ? x.message : 'No se pudo subir la foto.'); if (urls.length) onDone(urls); }
    finally { setBusy(''); }
  }
  return <><input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} hidden onChange={pick} />
    <button type="button" className="button button-outline" disabled={!!busy} onClick={() => ref.current?.click()}>{busy || label}</button></>;
}

function ImageField({ label, value, onChange, onError }: { label: string; value: string; onChange: (v: string) => void; onError: (m: string) => void }) {
  return <div className="se-thumb"><span style={{ flex: 1 }}><b className="small">{label}</b><br />{value ? <img src={value} alt="" /> : <small className="muted">Sin foto (se usa la predeterminada)</small>}</span>
    <Upload label={value ? 'Cambiar' : 'Subir foto'} onDone={u => onChange(u[0])} onError={onError} />{value && <button type="button" className="inline-link" onClick={() => onChange('')}>Quitar</button>}</div>;
}

function LinkField({ label, value, onChange }: { label: string; value: SiteLink | undefined; onChange: (v: SiteLink) => void }) {
  const v = value || { label: '', href: '' };
  return <div className="fp-two">
    <label>{label}: texto<input maxLength={40} value={v.label} onChange={e => onChange({ ...v, label: e.target.value })} placeholder="Vacío = sin botón" /></label>
    <label>Lleva a<input maxLength={400} list="se-links" value={v.href} onChange={e => onChange({ ...v, href: e.target.value })} placeholder="/propiedades o https://…" /></label>
  </div>;
}

function LinksList({ value, onChange, max, title }: { value: SiteLink[]; onChange: (v: SiteLink[]) => void; max: number; title: string }) {
  const set = (i: number, patch: Partial<SiteLink>) => onChange(value.map((l, j) => j === i ? { ...l, ...patch } : l));
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= value.length) return; const n = [...value]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return <div className="se-list"><b className="small">{title}</b>
    {value.map((l, i) => <div className="se-row" key={i}>
      <label>Texto<input maxLength={40} value={l.label} onChange={e => set(i, { label: e.target.value })} /></label>
      <label>Lleva a<input maxLength={400} list="se-links" value={l.href} onChange={e => set(i, { href: e.target.value })} /></label>
      <span className="se-card-tools"><button type="button" onClick={() => mv(i, -1)} disabled={i === 0} aria-label="Subir">▲</button><button type="button" onClick={() => mv(i, 1)} disabled={i === value.length - 1} aria-label="Bajar">▼</button><button type="button" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Quitar">✕</button></span>
    </div>)}
    {value.length < max && <button type="button" className="inline-link" onClick={() => onChange([...value, { label: '', href: '' }])}>+ Agregar enlace</button>}
  </div>;
}

/** Lista editable de elementos (tarjetas, pasos, preguntas). */
function Items<T extends Record<string, any>>({ value, onChange, max, empty, fields, addLabel }: { value: T[]; onChange: (v: T[]) => void; max: number; empty: T; addLabel: string; fields: (x: T, set: (p: Partial<T>) => void) => React.ReactNode }) {
  const list = value || [];
  const mv = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= list.length) return; const n = [...list]; [n[i], n[j]] = [n[j], n[i]]; onChange(n); };
  return <div className="se-list">{list.map((x, i) => <div className="se-card" key={i}>
    <div className="se-card-tools"><small className="muted" style={{ marginRight: 'auto' }}>#{i + 1}</small><button type="button" onClick={() => mv(i, -1)} disabled={i === 0} aria-label="Subir">▲</button><button type="button" onClick={() => mv(i, 1)} disabled={i === list.length - 1} aria-label="Bajar">▼</button><button type="button" onClick={() => onChange(list.filter((_, j) => j !== i))} aria-label="Quitar">✕</button></div>
    {fields(x, p => onChange(list.map((y, j) => j === i ? { ...y, ...p } : y)))}
  </div>)}
    {list.length < max && <button type="button" className="inline-link" onClick={() => onChange([...list, { ...empty }])}>{addLabel}</button>}</div>;
}

function BlockFields({ b, set, onError }: { b: SiteBlock; set: (p: Partial<SiteBlock>) => void; onError: (m: string) => void }) {
  const text = (k: string, label: string, max: number, area = false, rows = 4) => <label key={k}>{label}{area
    ? <textarea rows={rows} maxLength={max} value={b[k] || ''} onChange={e => set({ [k]: e.target.value })} />
    : <input maxLength={max} value={b[k] || ''} onChange={e => set({ [k]: e.target.value })} />}</label>;
  const head = <>{text('eyebrow', 'Frase pequeña arriba del título (opcional)', 80)}{text('title', 'Título', 160)}{text('copy', 'Texto bajo el título (opcional)', 400)}</>;
  switch (b.type) {
    case 'hero': return <>{text('eyebrow', 'Frase pequeña', 80)}<div className="fp-two">{text('title', 'Título', 160)}{text('highlight', 'Segunda línea (resaltada)', 120)}</div>{text('text', 'Texto', 400, true, 3)}
      <ImageField label="Foto de fondo" value={b.imageUrl || ''} onChange={v => set({ imageUrl: v })} onError={onError} />
      <LinkField label="Botón principal" value={b.button1} onChange={v => set({ button1: v })} />
      <LinkField label="Enlace secundario" value={b.button2} onChange={v => set({ button2: v })} />
      <label className="check"><input type="checkbox" checked={!!b.showSearch} onChange={e => set({ showSearch: e.target.checked })} /> Mostrar el buscador de propiedades</label>
      {b.showSearch && <div className="fp-two">{text('searchTitle', 'Título del buscador', 80)}{text('searchNote', 'Nota del buscador', 80)}</div>}</>;
    case 'paths': return <>{head}<Items value={b.cards} onChange={v => set({ cards: v })} max={6} addLabel="+ Agregar tarjeta" empty={{ badge: '', title: 'Nueva tarjeta', text: '', linkText: 'Ver más →', href: '/propiedades' }}
      fields={(c, s) => <><div className="fp-two"><label>Etiqueta<input maxLength={40} value={c.badge} onChange={e => s({ badge: e.target.value })} /></label><label>Título<input maxLength={80} value={c.title} onChange={e => s({ title: e.target.value })} /></label></div>
        <label>Texto<textarea rows={2} maxLength={300} value={c.text} onChange={e => s({ text: e.target.value })} /></label>
        <div className="fp-two"><label>Texto del enlace<input maxLength={50} value={c.linkText} onChange={e => s({ linkText: e.target.value })} /></label><label>Lleva a<input maxLength={400} list="se-links" value={c.href} onChange={e => s({ href: e.target.value })} /></label></div></>} /></>;
    case 'cities': return <>{head}<p className="muted small">Los municipios salen del catálogo y llevan a sus propiedades.</p></>;
    case 'featured': return <>{head}<div className="fp-two">
      <label>Cuántas<select value={b.count || 4} onChange={e => set({ count: Number(e.target.value) })}>{[4, 8, 12].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
      <label>Cuáles<select value={b.operation || ''} onChange={e => set({ operation: e.target.value })}><option value="">Renta y venta</option><option value="RENT">Solo renta</option><option value="SALE">Solo venta</option></select></label></div>
      {text('buttonText', 'Texto del botón “ver todas” (vacío = sin botón)', 50)}{text('emptyText', 'Texto si aún no hay propiedades', 200)}</>;
    case 'banner': return <>{text('eyebrow', 'Frase pequeña', 80)}<div className="fp-two">{text('title', 'Título', 160)}{text('highlight', 'Segunda línea (resaltada)', 120)}</div>{text('text', 'Texto', 500, true, 3)}
      <LinkField label="Botón" value={b.button} onChange={v => set({ button: v })} /></>;
    case 'text': return <>{head}{text('body', 'Texto (deja una línea en blanco entre párrafos)', 6000, true, 7)}
      <label>Alineación<select value={b.align || 'left'} onChange={e => set({ align: e.target.value })}><option value="left">Izquierda</option><option value="center">Centrado</option></select></label>
      <LinkField label="Botón (opcional)" value={b.button} onChange={v => set({ button: v })} /></>;
    case 'steps': return <>{head}<Items value={b.items} onChange={v => set({ items: v })} max={10} addLabel="+ Agregar paso" empty={{ title: 'Nuevo paso', text: '' }}
      fields={(x, s) => <><label>Título<input maxLength={80} value={x.title} onChange={e => s({ title: e.target.value })} /></label><label>Texto<textarea rows={2} maxLength={300} value={x.text} onChange={e => s({ text: e.target.value })} /></label></>} /></>;
    case 'faq': return <>{head}<Items value={b.items} onChange={v => set({ items: v })} max={25} addLabel="+ Agregar pregunta" empty={{ q: '¿Nueva pregunta?', a: '' }}
      fields={(x, s) => <><label>Pregunta<input maxLength={200} value={x.q} onChange={e => s({ q: e.target.value })} /></label><label>Respuesta<textarea rows={3} maxLength={1500} value={x.a} onChange={e => s({ a: e.target.value })} /></label></>} /></>;
    case 'image': return <>{head}<ImageField label="Foto" value={b.imageUrl || ''} onChange={v => set({ imageUrl: v })} onError={onError} />{text('caption', 'Texto al pie (opcional)', 200)}
      <label className="check"><input type="checkbox" checked={!!b.wide} onChange={e => set({ wide: e.target.checked })} /> A todo lo ancho</label></>;
    case 'gallery': return <>{head}
      <div className="fp-pick">{(b.images || []).map((u: string, i: number) => <label key={u + i} className="on"><img src={u} alt={`Foto ${i + 1}`} /><button type="button" className="inline-link" onClick={() => set({ images: b.images.filter((_: string, j: number) => j !== i) })}>Quitar</button></label>)}</div>
      {(b.images || []).length < 16 && <Upload label="Subir fotos" multiple onDone={u => set({ images: [...(b.images || []), ...u].slice(0, 16) })} onError={onError} />}</>;
    case 'video': return <>{head}<label>Enlace de YouTube o Vimeo<input maxLength={300} value={videoUrlOf(b)} onChange={e => set({ url: e.target.value })} placeholder="https://youtu.be/…" /></label></>;
    case 'contact': return <>{head}
      <label className="check"><input type="checkbox" checked={b.showEmail !== false} onChange={e => set({ showEmail: e.target.checked })} /> Botón de correo</label>
      <label className="check"><input type="checkbox" checked={b.showWhatsapp !== false} onChange={e => set({ showWhatsapp: e.target.checked })} /> Botón de WhatsApp</label>
      <div className="fp-two">{text('emailText', 'Texto del botón de correo', 50)}{text('whatsappText', 'Texto del botón de WhatsApp', 50)}</div>
      {text('subject', 'Asunto del correo', 120)}{text('message', 'Mensaje que se escribe solo', 600, true, 5)}
      <p className="muted small">El correo y el WhatsApp se configuran en “Encabezado y pie”.</p></>;
  }
  return null;
}

function SiteEditor() {
  const [state, setState] = useState<EditorState | null>(null);
  const [cfg, setCfg] = useState<SiteConfig | null>(null);
  const [tab, setTab] = useState<'pages' | 'brand' | 'chrome' | 'extra' | 'versions'>('pages');
  const [pageKey, setPageKey] = useState<string>('home');
  const [open, setOpen] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState(''); const [ok, setOk] = useState(''); const [busy, setBusy] = useState(false);
  const [versions, setVersions] = useState<Version[]>([]);
  const [featuredData, setFeaturedData] = useState<Record<string, { items: Property[]; total: number }>>({});
  const [over, setOver] = useState<number | null>(null);
  const [, setHv] = useState(0);
  const hist = useRef<{ past: SiteConfig[]; future: SiteConfig[]; last: number }>({ past: [], future: [], last: 0 });
  const rev = useRef(0);
  const drag = useRef<{ kind: 'move'; index: number } | { kind: 'new'; type: SiteBlockType } | null>(null);

  const apply = (x: EditorState) => { setState(x); setCfg(withDefaults(x.draft)); setDirty(false); setSaveState('idle'); hist.current = { past: [], future: [], last: 0 }; };
  const load = useCallback(async () => { try { apply(await authJson<EditorState>('/admin/site')); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo abrir el editor.'); } }, []);
  useEffect(() => { load(); }, [load]);
  // Propiedades de muestra para la vista previa de los bloques "Propiedades".
  useEffect(() => {
    (async () => {
      const out: Record<string, { items: Property[]; total: number }> = {};
      for (const op of ['', 'RENT', 'SALE']) {
        try { const r = await fetch(`/api/v1/properties?take=12&sort=recent${op ? `&operation=${op}` : ''}`); const d = await r.json(); out[op] = { items: (d.items as ApiProperty[]).map(toCard), total: d.total }; } catch { out[op] = { items: [], total: 0 }; }
      }
      setFeaturedData(out);
    })();
  }, []);
  useEffect(() => { if (tab === 'versions') authJson<Version[]>('/admin/site/versions').then(setVersions).catch(() => {}); }, [tab]);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, [dirty]);

  const saveNow = async (auto = false) => {
    if (!cfg) return false;
    const mine = rev.current; setSaveState('saving'); if (!auto) { setError(''); setOk(''); }
    try {
      const x = await authJson<EditorState>('/admin/site', { method: 'PUT', body: JSON.stringify({ config: cfg }) });
      setState(x); setSaveState('saved'); if (mine === rev.current) setDirty(false); if (auto) setError('');
      return true;
    } catch (e) { setSaveState('error'); setError(`No se pudo guardar: ${e instanceof Error ? e.message : 'revisa los datos.'}`); return false; }
  };
  useEffect(() => { if (!dirty || !cfg) return; const t = setTimeout(() => { saveNow(true); }, 2500); return () => clearTimeout(t); }, [dirty, cfg]); // eslint-disable-line react-hooks/exhaustive-deps

  async function call(fn: () => Promise<EditorState>, done: string) {
    setBusy(true); setError(''); setOk('');
    try { apply(await fn()); setOk(done); } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo completar.'); } finally { setBusy(false); }
  }
  const publish = () => call(() => authJson<EditorState>('/admin/site/publish', { method: 'POST', body: JSON.stringify({ config: cfg }) }), '¡Listo! Los cambios ya se ven en el sitio público.');

  // Historial para deshacer/rehacer (los tecleos seguidos cuentan como un cambio).
  const update = (fn: (c: SiteConfig) => SiteConfig, force = true) => {
    setCfg(c => {
      if (!c) return c;
      const h = hist.current, now = Date.now();
      if (force || now - h.last > 900) { h.past.push(c); if (h.past.length > 60) h.past.shift(); h.future = []; }
      h.last = now; return fn(c);
    });
    rev.current++; setDirty(true); setHv(v => v + 1);
  };
  const undo = () => { const h = hist.current, x = h.past.pop(); if (!x || !cfg) return; h.future.push(cfg); setCfg(x); h.last = 0; rev.current++; setDirty(true); setHv(v => v + 1); };
  const redo = () => { const h = hist.current, x = h.future.pop(); if (!x || !cfg) return; h.past.push(cfg); setCfg(x); h.last = 0; rev.current++; setDirty(true); setHv(v => v + 1); };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return; const t = e.target as HTMLElement; if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; e.preventDefault(); e.shiftKey ? redo() : undo(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

  // Bloques de la página que se está editando (Inicio, Anunciar o una página extra "x<n>").
  const blocksOf = (c: SiteConfig, key: string): SiteBlock[] => key.startsWith('x') ? c.extra[Number(key.slice(1))]?.blocks || [] : c.pages[key as SitePageKey] || [];
  const withBlocks = (c: SiteConfig, key: string, blocks: SiteBlock[]): SiteConfig => key.startsWith('x')
    ? { ...c, extra: c.extra.map((p, i) => i === Number(key.slice(1)) ? { ...p, blocks } : p) }
    : { ...c, pages: { ...c.pages, [key]: blocks } };
  const setBlocks = (fn: (bs: SiteBlock[]) => SiteBlock[], force = true) => update(c => withBlocks(c, pageKey, fn(blocksOf(c, pageKey))), force);
  const blocks = cfg ? blocksOf(cfg, pageKey) : [];
  const edit = (i: number, patch: Partial<SiteBlock>) => setBlocks(bs => bs.map((b, j) => j === i ? { ...b, ...patch } : b), false);
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= blocks.length) return; setBlocks(bs => { const n = [...bs]; [n[i], n[j]] = [n[j], n[i]]; return n; }); };
  const remove = (i: number) => { if (confirm('¿Quitar este bloque? (puedes deshacerlo)')) setBlocks(bs => bs.filter((_, j) => j !== i)); };
  const insert = (type: SiteBlockType, at?: number) => { if (blocks.length >= MAX_BLOCKS) return; const b = { ...SITE_BLOCKS[type].make(), id: newSiteId() } as SiteBlock; setBlocks(bs => { const n = [...bs]; n.splice(at ?? n.length, 0, b); return n; }); setOpen(b.id); };
  const duplicate = (i: number) => { if (blocks.length >= MAX_BLOCKS) return; const c = { ...structuredClone(blocks[i]), id: newSiteId() }; setBlocks(bs => { const n = [...bs]; n.splice(i + 1, 0, c); return n; }); setOpen(c.id); };
  const toggle = (i: number) => setBlocks(bs => bs.map((x, j) => j === i ? { ...x, hidden: !x.hidden } : x));
  const drop = (at: number) => {
    const g = drag.current; drag.current = null; setOver(null); if (!g) return;
    if (g.kind === 'new') { insert(g.type, at); return; }
    if (g.index === at || g.index + 1 === at) return;
    setBlocks(bs => { const n = [...bs]; const [x] = n.splice(g.index, 1); n.splice(at > g.index ? at - 1 : at, 0, x); return n; });
  };
  const restorePage = () => { if (pageKey.startsWith('x')) return; if (confirm(`¿Regresar la página "${PAGE_LABEL[pageKey as SitePageKey].label}" a su diseño original? (puedes deshacerlo)`)) setBlocks(() => structuredClone(DEFAULT_SITE.pages[pageKey as SitePageKey] || [])); };

  const setBrand = (p: Partial<SiteConfig['brand']>) => update(c => ({ ...c, brand: { ...c.brand, ...p } }), false);
  const setTheme = (p: Partial<SiteConfig['theme']>) => update(c => ({ ...c, theme: { ...c.theme, ...p } }), false);
  const setHeader = (p: Partial<SiteConfig['header']>) => update(c => ({ ...c, header: { ...c.header, ...p } }), false);
  const setContact = (p: Partial<SiteConfig['contact']>) => update(c => ({ ...c, contact: { ...c.contact, ...p } }), false);
  const setFooter = (p: Partial<SiteConfig['footer']>) => update(c => ({ ...c, footer: { ...c.footer, ...p } }), false);
  const setExtra = (fn: (x: ExtraPage[]) => ExtraPage[]) => update(c => ({ ...c, extra: fn(c.extra) }), false);
  const fail = (m: string) => setError(m);

  if (!cfg || !state) return <main className="page-wrap"><Link href="/panel/admin" className="back-link">← Panel</Link><p className={error ? 'notice' : 'muted'}>{error || 'Cargando editor…'}</p></main>;
  const featured: Featured = Object.fromEntries(blocks.filter(b => b.type === 'featured').map(b => {
    const f = featuredData[b.operation || '']; return [b.id, f ? { items: f.items.slice(0, Number(b.count) || 4), total: f.total } : undefined];
  }).filter(([, v]) => v)) as Featured;
  const pageList: [string, string][] = [['home', 'Inicio'], ['anunciar', 'Anunciar'], ...cfg.extra.map((p, i) => [`x${i}`, p.title || `Página ${i + 1}`] as [string, string])];
  if (!pageList.some(([k]) => k === pageKey)) setTimeout(() => setPageKey('home'), 0);
  const publicPath = pageKey.startsWith('x') ? `/p/${cfg.extra[Number(pageKey.slice(1))]?.slug || ''}` : PAGE_LABEL[pageKey as SitePageKey]?.path || '/';

  return <main className="page-wrap fp-editor-page">
    <datalist id="se-links">{[...SUGGESTED_LINKS, ...cfg.extra.map(p => `/p/${p.slug}`)].map(l => <option key={l} value={l} />)}</datalist>
    <Link href="/panel/admin" className="back-link">← Panel de administración</Link>
    <div className="page-heading panel-heading"><div>
      <span className="eyebrow">DISEÑO DEL SITIO · SOLO ADMINISTRADORES</span><h1>Editar el sitio</h1>
      <p>{state.hasPublished ? <i className="status-pill ok">Diseño propio publicado</i> : <i className="status-pill neutral">Diseño original</i>} {state.publishedAt && <small className="muted">Última publicación: {when(state.publishedAt)}</small>} {!dirty && state.unpublishedChanges ? <i className="status-pill warn">Hay cambios sin publicar</i> : null}</p>
    </div></div>
    <p className="muted">Cambia textos, fotos, colores, logotipo, menú, pie de página y el orden de las secciones de todo el sitio. El borrador se guarda solo; nada cambia para el público hasta que presionas <b>Publicar</b>. Por seguridad no se puede escribir código (HTML/CSS). Las fichas de propiedades, el catálogo y los paneles toman automáticamente tus colores, fuente y logotipo.</p>
    {error && <div className="notice" role="alert">{error}</div>}
    {ok && <div className="notice ok" role="status">{ok}</div>}

    <div className="auth-tabs fp-tabs" role="tablist" style={{ maxWidth: 860 }}>{([['pages', 'Páginas'], ['brand', 'Logotipo y colores'], ['chrome', 'Menú, contacto y pie'], ['extra', 'Páginas extra'], ['versions', 'Versiones']] as const).map(([k, l]) =>
      <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'selected' : ''} onClick={() => setTab(k)}>{l}</button>)}</div>

    {tab === 'pages' && <>
      <div className="se-pages" role="group" aria-label="Página a editar">{pageList.map(([k, l]) => <button key={k} type="button" className={pageKey === k ? 'on' : ''} aria-pressed={pageKey === k} onClick={() => { setPageKey(k); setOpen(''); }}>{l}</button>)}
        <button type="button" onClick={() => setTab('extra')}>+ Nueva página</button></div>
      <div className="fp-editor">
        <div className="fp-controls">
          <section className="dashboard-card"><h3>Agregar sección</h3>
            <p className="muted small">Haz clic para agregarla al final o arrástrala al lugar donde la quieres.</p>
            <div className="fp-palette-grid">{(Object.entries(SITE_BLOCKS) as [SiteBlockType, typeof SITE_BLOCKS[SiteBlockType]][]).map(([k, v]) =>
              <button key={k} type="button" className="fp-new" title={v.help} draggable disabled={blocks.length >= MAX_BLOCKS}
                onDragStart={e => { drag.current = { kind: 'new', type: k }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', k); }} onDragEnd={() => { drag.current = null; setOver(null); }}
                onClick={() => insert(k)}><span aria-hidden>{v.icon}</span>{v.label}</button>)}</div>
          </section>
          <section className="dashboard-card"><h3>Secciones de “{pageList.find(([k]) => k === pageKey)?.[1]}”</h3><p className="muted small">Arrastra desde ⋮⋮ para cambiar el orden. Haz clic en una sección para editarla.</p>
            <ol className="fp-blocks">{blocks.map((b, i) => <li key={b.id} id={`seb-${b.id}`} className={`${b.hidden ? 'is-hidden' : ''}${over === i ? ' drop-here' : ''}`}
              onDragOver={e => { if (drag.current) { e.preventDefault(); if (over !== i) setOver(i); } }} onDrop={e => { e.preventDefault(); drop(i); }}>
              <div className="fp-block-head">
                <span className="fp-grip" draggable title="Arrastrar para mover" aria-label="Arrastrar para mover"
                  onDragStart={e => { drag.current = { kind: 'move', index: i }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); }}
                  onDragEnd={() => { drag.current = null; setOver(null); }}>⋮⋮</span>
                <button type="button" className="fp-block-name" onClick={() => setOpen(open === b.id ? '' : b.id)} aria-expanded={open === b.id}><span aria-hidden>{SITE_BLOCKS[b.type]?.icon} </span>{SITE_BLOCKS[b.type]?.label || b.type}{b.title ? ` · ${String(b.title).slice(0, 26)}` : ''}</button>
                <span className="fp-block-tools">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" title="Subir">▲</button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Bajar" title="Bajar">▼</button>
                  <button type="button" onClick={() => duplicate(i)} disabled={blocks.length >= MAX_BLOCKS} aria-label="Duplicar" title="Duplicar">⧉</button>
                  <button type="button" onClick={() => toggle(i)} aria-label={b.hidden ? 'Mostrar' : 'Ocultar'} title={b.hidden ? 'Mostrar' : 'Ocultar'}>{b.hidden ? '🙈' : '👁'}</button>
                  <button type="button" onClick={() => remove(i)} aria-label="Quitar" title="Quitar">✕</button>
                </span>
              </div>
              {open === b.id && <div className="fp-block-form">
                <BlockFields b={b} set={p => edit(i, p)} onError={fail} />
                {b.type !== 'hero' && <label>Fondo de la sección<select value={b.bg || 'light'} onChange={e => edit(i, { bg: e.target.value as SiteBg })}>{(Object.keys(BG_LABEL) as SiteBg[]).map(k => <option key={k} value={k}>{BG_LABEL[k]}</option>)}</select></label>}
              </div>}
            </li>)}
              <li className={`fp-drop-end${over === blocks.length ? ' drop-here' : ''}`} onDragOver={e => { if (drag.current) { e.preventDefault(); if (over !== blocks.length) setOver(blocks.length); } }} onDrop={e => { e.preventDefault(); drop(blocks.length); }}>Suelta aquí para dejarla al final</li>
            </ol>
            {!pageKey.startsWith('x') && <button type="button" className="inline-link" onClick={restorePage}>Regresar esta página a su diseño original</button>}
          </section>
        </div>
        <div className="fp-preview site-preview" aria-label="Vista previa">
          <style>{themeCss(cfg.theme).replace(':root', '.site-preview')}</style>
          <div className="fp-preview-bar"><span>Vista previa · {publicPath}</span></div>
          <div className="site-preview-chrome"><SiteBrand brand={cfg.brand} href="#" /><nav>{cfg.header.links.map((l, i) => <span key={i}>{l.label}</span>)}{cfg.extra.filter(p => p.inHeader).map(p => <span key={p.slug}>{p.title}</span>)}</nav></div>
          <SiteBlocks blocks={blocks} site={cfg} featured={featured} editor={{
            selected: open, over,
            onSelect: id => { setOpen(id); setTimeout(() => document.getElementById(`seb-${id}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 30); },
            onMove: move, onDuplicate: duplicate, onRemove: remove, onToggle: toggle,
            onDragStart: i => { drag.current = { kind: 'move', index: i }; }, onDragEnd: () => { drag.current = null; setOver(null); },
            onDragOver: at => { if (over !== at) setOver(at); }, onDrop: drop, dragging: () => !!drag.current,
          }} />
          <div className="site-preview-foot">{cfg.footer.about || 'Pie de página'}</div>
          <p className="muted small fp-preview-help">Haz clic en una sección para editarla. Pasa el ratón para moverla (arrastra “⋮⋮ Mover” o usa ▲▼), duplicarla, ocultarla o quitarla.</p>
        </div>
      </div>
    </>}

    {tab === 'brand' && <div className="fp-two">
      <section className="dashboard-card fp-controls"><h3>Logotipo y nombre</h3>
        <ImageField label="Logotipo (PNG o JPG; se recomienda fondo transparente o blanco)" value={cfg.brand.logoUrl} onChange={v => setBrand({ logoUrl: v })} onError={fail} />
        {cfg.brand.logoUrl && <label className="check"><input type="checkbox" checked={cfg.brand.logoOnly} onChange={e => setBrand({ logoOnly: e.target.checked })} /> Mostrar solo el logotipo (sin el nombre a un lado)</label>}
        <label>Nombre<input maxLength={40} value={cfg.brand.name} onChange={e => setBrand({ name: e.target.value })} /></label>
        <label>Frase bajo el nombre<input maxLength={70} value={cfg.brand.tagline} onChange={e => setBrand({ tagline: e.target.value })} /></label>
        {!cfg.brand.logoUrl && <label>Iniciales del cuadro (si no hay logotipo)<input maxLength={4} value={cfg.brand.mark} onChange={e => setBrand({ mark: e.target.value })} /></label>}
        <div className="site-preview-chrome" style={{ borderRadius: 8 }}><style>{themeCss(cfg.theme).replace(':root', '.brand-sample')}</style><span className="brand-sample"><SiteBrand brand={cfg.brand} href="#" /></span></div>
      </section>
      <section className="dashboard-card fp-controls"><h3>Colores y fuente de todo el sitio</h3>
        <div className="fp-palettes">{SITE_PALETTES.map(x => <button key={x.name} type="button" title={x.name} onClick={() => setTheme(x.theme)} className="fp-palette"><i style={{ background: x.theme.primary }} /><i style={{ background: x.theme.accent }} /><i style={{ background: x.theme.background }} /><span>{x.name}</span></button>)}</div>
        <div className="fp-two">
          {([['primary', 'Principal (encabezados, botones)'], ['accent', 'Acento (detalles dorados)'], ['background', 'Fondo'], ['text', 'Texto']] as const).map(([k, l]) => <label key={k} className="fp-color">{l}<input type="color" value={cfg.theme[k]} onChange={e => setTheme({ [k]: e.target.value.toUpperCase() })} /></label>)}
        </div>
        <label>Fuente<select value={cfg.theme.font} onChange={e => setTheme({ font: e.target.value as SiteConfig['theme']['font'] })}>{Object.entries(SITE_FONTS).map(([k, f]) => <option key={k} value={k}>{f.label}</option>)}</select></label>
        <button type="button" className="inline-link" onClick={() => setTheme({ ...DEFAULT_SITE.theme })}>Regresar a los colores originales</button>
      </section>
    </div>}

    {tab === 'chrome' && <div className="fp-two">
      <section className="dashboard-card fp-controls"><h3>Menú superior</h3>
        <LinksList title="Enlaces del menú (máximo 6)" value={cfg.header.links} max={6} onChange={v => setHeader({ links: v })} />
        <p className="muted small">“Cómo funciona” (solo administradores), “Ingresar” y el acceso a tu panel se agregan solos.</p>
        <LinkField label="Botón dorado (visitantes)" value={{ label: cfg.header.buttonText, href: cfg.header.buttonHref }} onChange={v => setHeader({ buttonText: v.label, buttonHref: v.href })} />
        <h3>Datos de contacto</h3>
        <div className="fp-two">
          <label>Correo<input type="email" maxLength={120} value={cfg.contact.email} onChange={e => setContact({ email: e.target.value })} placeholder="contacto@tusitio.mx" /></label>
          <label>WhatsApp (10 dígitos)<input inputMode="tel" maxLength={25} value={cfg.contact.whatsapp} onChange={e => setContact({ whatsapp: e.target.value })} placeholder="4771234567" /></label>
          <label>Teléfono (opcional)<input inputMode="tel" maxLength={25} value={cfg.contact.phone} onChange={e => setContact({ phone: e.target.value })} /></label>
          <label>Dirección (opcional)<input maxLength={200} value={cfg.contact.address} onChange={e => setContact({ address: e.target.value })} /></label>
        </div>
        <p className="muted small">Se usan en el pie de página y en los botones de contacto (por ejemplo en “Anunciar”).</p>
      </section>
      <section className="dashboard-card fp-controls"><h3>Pie de página</h3>
        <label>Texto de presentación<textarea rows={3} maxLength={400} value={cfg.footer.about} onChange={e => setFooter({ about: e.target.value })} /></label>
        <label>Texto de la última línea (usa {'{año}'} para el año actual)<input maxLength={160} value={cfg.footer.bottom} onChange={e => setFooter({ bottom: e.target.value })} /></label>
        <b className="small">Redes sociales (deja vacío para ocultar)</b>
        <div className="fp-two">{(Object.keys(SOCIAL_LABEL) as Social[]).map(k => <label key={k}>{SOCIAL_LABEL[k]}<input maxLength={300} value={cfg.footer.social[k] || ''} onChange={e => setFooter({ social: { ...cfg.footer.social, [k]: e.target.value } })} placeholder="https://…" /></label>)}</div>
        <b className="small">Columnas de enlaces (máximo 4)</b>
        <Items<FooterColumn> value={cfg.footer.columns} onChange={v => setFooter({ columns: v })} max={4} addLabel="+ Agregar columna" empty={{ title: 'Nueva columna', links: [], auto: '' }}
          fields={(col, s) => <><div className="fp-two"><label>Título<input maxLength={40} value={col.title} onChange={e => s({ title: e.target.value })} /></label>
            <label>Contenido<select value={col.auto} onChange={e => s({ auto: e.target.value as FooterColumn['auto'] })}><option value="">Mis enlaces</option><option value="municipios">Municipios (automático)</option></select></label></div>
            {col.auto === '' && <LinksList title="Enlaces" value={col.links} max={8} onChange={v => s({ links: v })} />}</>} />
        <p className="muted small">Los datos de contacto aparecen al final de la última columna. Las páginas extra marcadas “en el pie” salen en la última línea.</p>
      </section>
    </div>}

    {tab === 'extra' && <section className="dashboard-card fp-controls"><h3>Páginas extra</h3>
      <p className="muted">Crea páginas nuevas como “Nosotros”, “Servicios”, “Aviso de privacidad” o “Términos y condiciones”. Cada una tiene su dirección <code>/p/…</code> y se arma con las mismas secciones.</p>
      <Items<ExtraPage> value={cfg.extra} onChange={v => setExtra(() => v)} max={12} addLabel="+ Crear página"
        empty={{ slug: `pagina-${cfg.extra.length + 1}`, title: 'Nueva página', description: '', inHeader: false, inFooter: true, blocks: [{ ...SITE_BLOCKS.text.make(), id: newSiteId(), eyebrow: '', title: 'Nueva página', body: 'Escribe aquí el contenido.' } as unknown as SiteBlock] }}
        fields={(p, s) => <><div className="fp-two"><label>Título<input maxLength={100} value={p.title} onChange={e => s({ title: e.target.value })} /></label>
          <label>Dirección: /p/<input maxLength={60} value={p.slug} onChange={e => s({ slug: e.target.value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9-]+/g, '-').replace(/^-+/, '') })} /></label></div>
          <label>Descripción para Google (opcional)<input maxLength={200} value={p.description} onChange={e => s({ description: e.target.value })} /></label>
          <label className="check"><input type="checkbox" checked={p.inHeader} onChange={e => s({ inHeader: e.target.checked })} /> Mostrar en el menú superior</label>
          <label className="check"><input type="checkbox" checked={p.inFooter} onChange={e => s({ inFooter: e.target.checked })} /> Mostrar en el pie de página</label>
          <button type="button" className="button button-outline" onClick={() => { setPageKey(`x${cfg.extra.indexOf(p)}`); setTab('pages'); setOpen(''); }}>Editar el contenido de esta página</button></>} />
    </section>}

    {tab === 'versions' && <section className="dashboard-card"><h3>Historial de versiones</h3>
      <p className="muted">Cada vez que publicas se guarda una copia (las últimas 30). “Restaurar” la copia al borrador; revísala y publícala.</p>
      {versions.length === 0 ? <p className="muted">Aún no hay versiones publicadas.</p> : <ul className="doc-list">{versions.map(v => <li key={v.id}><b>{when(v.createdAt)}</b> <span>{v.note}</span> <small className="muted">{v.by || ''}</small>
        <button className="inline-link" disabled={busy} onClick={() => confirm('¿Restaurar esta versión en el borrador?') && call(() => authJson<EditorState>(`/admin/site/versions/${v.id}/restore`, { method: 'POST' }), 'Versión restaurada en el borrador. Revísala y publícala.').then(() => setTab('pages'))}>Restaurar</button></li>)}</ul>}
      <p style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {state.unpublishedChanges && <button className="button button-outline" disabled={busy} onClick={() => confirm('¿Descartar los cambios del borrador y volver a lo publicado?') && call(() => authJson<EditorState>('/admin/site/discard', { method: 'POST' }), 'Se descartaron los cambios sin publicar.')}>Descartar cambios sin publicar</button>}
        {state.hasPublished && <button className="button button-ghost" disabled={busy} onClick={() => confirm('¿Volver TODO el sitio a su diseño original? Se guarda una copia del diseño actual en este historial.') && call(() => authJson<EditorState>('/admin/site/reset', { method: 'POST' }), 'El sitio volvió a su diseño original.')}>Volver todo el sitio al diseño original</button>}
      </p>
    </section>}

    <div className="fp-bar" role="toolbar" aria-label="Guardar y publicar">
      <span className={`fp-save-state ${saveState}`} role="status">{dirty ? (saveState === 'saving' ? 'Guardando…' : saveState === 'error' ? '⚠ No se pudo guardar' : 'Cambios sin guardar…') : saveState === 'saved' ? '✓ Borrador guardado' : state.unpublishedChanges ? 'Borrador sin publicar' : 'Todo al día'}</span>
      <button type="button" className="button button-ghost" onClick={undo} disabled={!hist.current.past.length} title="Deshacer (Ctrl+Z)">↶ Deshacer</button>
      <button type="button" className="button button-ghost" onClick={redo} disabled={!hist.current.future.length} title="Rehacer (Ctrl+Mayús+Z)">↷ Rehacer</button>
      <button type="button" className="button button-outline" disabled={busy || !dirty} onClick={() => saveNow(false)}>Guardar ahora</button>
      <button type="button" className="button button-gold" disabled={busy || (!dirty && !state.unpublishedChanges && state.hasPublished)} onClick={publish}>Publicar</button>
      <a className="button button-outline light" href={publicPath} target="_blank" rel="noopener noreferrer">Ver sitio ↗</a>
    </div>
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['ADMIN']}>{() => <SiteEditor />}</ProtectedPanel>;
}
