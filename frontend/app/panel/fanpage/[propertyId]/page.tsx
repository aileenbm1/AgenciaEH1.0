"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import ProtectedPanel from '@/components/protected-panel';
import FanpageView from '@/components/fanpage-view';
import LocationPicker from '@/components/location-picker';
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
type Loc = { latitude: number | null; longitude: number | null; showExactLocation: boolean };
function BlockFields({ b, set, images, loc, onLoc, hint }: { b: Block; set: (patch: Partial<Block>) => void; images: { url: string; label?: string | null }[]; loc: Loc; onLoc: (v: Loc) => void; hint: string }) {
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
    case 'share': return text('title', 'Título', 140);
    case 'map': return <>{text('title', 'Título', 140)}
      <p className="muted small">La ubicación es la de la propiedad. Búscala o haz clic en el mapa: se guarda al momento y también aparece en la ficha y en el catálogo.</p>
      <LocationPicker value={loc} onChange={onLoc} hint={hint} />
      {text('note', 'Texto bajo el mapa (opcional, ej. “A 5 min del centro”)', 200)}</>;
    case 'reserve': return <>{text('title', 'Título', 140)}{text('text', 'Texto', 400)}<p className="muted small">Muestra el calendario, la cotización y el botón de solicitud (noche, semana, mes o apartado, según la propiedad).</p></>;
    case 'agent': return <>{text('title', 'Título', 140)}{text('text', 'Texto de presentación (opcional)', 400)}
      <label className="check"><input type="checkbox" checked={b.showWhatsapp !== false} onChange={e => set({ showWhatsapp: e.target.checked })} /> Mostrar botón de WhatsApp</label>
      <p className="muted small">La foto y el nombre salen del perfil del asesor.</p></>;
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
  const [device, setDevice] = useState<'desk' | 'tablet' | 'phone'>('desk');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [over, setOver] = useState<number | null>(null);
  const [, setHv] = useState(0);
  // Historial para deshacer/rehacer y control del guardado automático.
  const hist = useRef<{ past: { theme: Theme; blocks: Block[] }[]; future: { theme: Theme; blocks: Block[] }[]; last: number }>({ past: [], future: [], last: 0 });
  const rev = useRef(0);
  const drag = useRef<{ kind: 'move'; index: number } | { kind: 'new'; type: BlockType } | null>(null);
  const [utm, setUtm] = useState({ source: 'facebook', medium: 'social', campaign: '' });
  const [tplName, setTplName] = useState('');

  const apply = (x: Editor) => { setD(x); setTheme(x.theme); setBlocks(x.blocks.map(b => ({ ...b, id: b.id || newId() }))); setDirty(false); setSaveState('idle'); hist.current = { past: [], future: [], last: 0 }; };
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
  // Guardado manual: no reemplaza lo que estás escribiendo, solo actualiza el estado.
  const saveNow = async (auto = false) => {
    const mine = rev.current; setSaveState('saving'); if (!auto) { setError(''); setOk(''); }
    try {
      const x = await authJson<Editor>(`/fanpages/${propertyId}`, { method: 'PUT', body: JSON.stringify({ theme, blocks, auto }) });
      setD(x); setSaveState('saved'); if (mine === rev.current) setDirty(false); if (auto) setError('');
      return true;
    } catch (e) { setSaveState('error'); setError(`No se pudo guardar: ${e instanceof Error ? e.message : 'revisa los bloques.'}`); return false; }
  };
  const save = () => saveNow(false);
  // Guardado automático del borrador unos segundos después del último cambio.
  useEffect(() => {
    if (!dirty || !theme) return;
    const t = setTimeout(() => { saveNow(true); }, 2500);
    return () => clearTimeout(t);
  }, [dirty, blocks, theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const publish = async () => {
    if ((dirty || d?.status === 'NEW') && !(await saveNow(false))) return;
    await call(() => authJson<Editor>(`/fanpages/${propertyId}/publish`, { method: 'POST' }), d?.requireApproval ? 'Enviada a aprobación del administrador.' : '¡Fanpage publicada!');
  };

  // Cada cambio se anota para poder deshacerlo (los tecleos seguidos cuentan como uno).
  const touch = (force = true) => {
    const h = hist.current, now = Date.now();
    if (theme && (force || now - h.last > 900)) { h.past.push({ theme, blocks }); if (h.past.length > 60) h.past.shift(); h.future = []; }
    h.last = now; rev.current++; setDirty(true); setHv(v => v + 1);
  };
  const undo = () => { const h = hist.current, x = h.past.pop(); if (!x || !theme) return; h.future.push({ theme, blocks }); setTheme(x.theme); setBlocks(x.blocks); h.last = 0; rev.current++; setDirty(true); setHv(v => v + 1); };
  const redo = () => { const h = hist.current, x = h.future.pop(); if (!x || !theme) return; h.past.push({ theme, blocks }); setTheme(x.theme); setBlocks(x.blocks); h.last = 0; rev.current++; setDirty(true); setHv(v => v + 1); };
  const edit = (i: number, patch: Partial<Block>) => { touch(false); setBlocks(bs => bs.map((b, j) => j === i ? { ...b, ...patch } : b)); };
  const move = (i: number, dir: -1 | 1) => { const j = i + dir; if (j < 0 || j >= blocks.length) return; touch(); setBlocks(bs => { const n = [...bs]; [n[i], n[j]] = [n[j], n[i]]; return n; }); };
  const remove = (i: number) => { if (confirm('¿Quitar este bloque? (puedes deshacerlo)')) { touch(); setBlocks(bs => bs.filter((_, j) => j !== i)); } };
  const insert = (type: BlockType, at?: number) => { if (blocks.length >= 30) return; touch(); const b = { ...BLOCKS[type].make(), id: newId() } as Block; setBlocks(bs => { const n = [...bs]; n.splice(at ?? n.length, 0, b); return n; }); setOpen(b.id); };
  const duplicate = (i: number) => { if (blocks.length >= 30) return; touch(); const c = { ...blocks[i], id: newId() }; setBlocks(bs => { const n = [...bs]; n.splice(i + 1, 0, c); return n; }); setOpen(c.id); };
  const setT = (patch: Partial<Theme>) => { touch(false); setTheme(t => ({ ...t!, ...patch })); };
  // Arrastrar: mover un bloque o soltar uno nuevo desde la paleta en la posición "at".
  const drop = (at: number) => {
    const g = drag.current; drag.current = null; setOver(null); if (!g) return;
    if (g.kind === 'new') { insert(g.type, at); return; }
    if (g.index === at || g.index + 1 === at) return;
    touch(); setBlocks(bs => { const n = [...bs]; const [x] = n.splice(g.index, 1); n.splice(at > g.index ? at - 1 : at, 0, x); return n; });
  };
  // Ubicación desde el bloque de mapa: se guarda en la propiedad al momento.
  const setLoc = async (v: Loc) => {
    setD(x => x ? { ...x, property: { ...x.property, ...v } } : x);
    try { await authJson(`/fanpages/${propertyId}/location`, { method: 'PUT', body: JSON.stringify(v) }); setOk('Ubicación guardada en la propiedad.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar la ubicación.'); }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return; const t = e.target as HTMLElement; if (/INPUT|TEXTAREA|SELECT/.test(t.tagName)) return; e.preventDefault(); e.shiftKey ? redo() : undo(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });

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
      <p><i className={`status-pill ${stTone}`}>{stLabel}</i> {d.publishedAt && <small className="muted">Publicada el {when(d.publishedAt)}</small>} {!dirty && d.unpublishedChanges && d.status !== 'PENDING' ? <i className="status-pill warn">Borrador con cambios sin publicar</i> : null}</p>
      {d.property.status !== 'PUBLISHED' && <p className="muted">La propiedad aún no está publicada: su fanpage será pública cuando el administrador apruebe la propiedad.</p>}
      {d.status === 'REJECTED' && d.reviewNote && <div className="notice">Nota del administrador: {d.reviewNote}</div>}
    </div>
    </div>
    <p className="muted">Editor seguro por bloques: cambias textos, fotos, colores, fuente y el orden (arrastra los bloques). El borrador se guarda solo; “Publicar” lo hace visible al público. No se puede escribir código (HTML/CSS) — así nadie puede romper ni insertar contenido peligroso.</p>
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
        <section className="dashboard-card"><h3>Agregar bloque</h3>
          <p className="muted small">Haz clic para agregarlo al final o arrástralo al lugar donde lo quieres.</p>
          <div className="fp-palette-grid">{(Object.entries(BLOCKS) as [BlockType, typeof BLOCKS[BlockType]][]).map(([k, v]) =>
            <button key={k} type="button" className="fp-new" title={v.help} draggable disabled={blocks.length >= 30}
              onDragStart={e => { drag.current = { kind: 'new', type: k }; e.dataTransfer.effectAllowed = 'copy'; e.dataTransfer.setData('text/plain', k); }} onDragEnd={() => { drag.current = null; setOver(null); }}
              onClick={() => insert(k)}><span aria-hidden>{v.icon}</span>{v.label}</button>)}</div>
        </section>
        <section className="dashboard-card"><h3>Bloques de la página</h3><p className="muted small">Arrastra desde ⋮⋮ para cambiar el orden. {TOKENS_HELP}</p>
          <ol className="fp-blocks">{blocks.map((b, i) => <li key={b.id} className={`${b.hidden ? 'is-hidden' : ''}${over === i ? ' drop-here' : ''}`}
            onDragOver={e => { if (drag.current) { e.preventDefault(); if (over !== i) setOver(i); } }} onDrop={e => { e.preventDefault(); drop(i); }}>
            <div className="fp-block-head">
              <span className="fp-grip" draggable title="Arrastrar para mover" aria-label="Arrastrar para mover"
                onDragStart={e => { drag.current = { kind: 'move', index: i }; e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); const li = (e.currentTarget as HTMLElement).closest('li'); if (li) e.dataTransfer.setDragImage(li, 16, 16); }}
                onDragEnd={() => { drag.current = null; setOver(null); }}>⋮⋮</span>
              <button type="button" className="fp-block-name" onClick={() => setOpen(open === b.id ? '' : b.id)} aria-expanded={open === b.id}><span aria-hidden>{BLOCKS[b.type]?.icon} </span>{BLOCKS[b.type]?.label || b.type}{b.title ? ` · ${fill(String(b.title), d.property).slice(0, 26)}` : ''}</button>
              <span className="fp-block-tools">
                <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" title="Subir">▲</button>
                <button type="button" onClick={() => move(i, 1)} disabled={i === blocks.length - 1} aria-label="Bajar" title="Bajar">▼</button>
                <button type="button" onClick={() => duplicate(i)} disabled={blocks.length >= 30} aria-label="Duplicar" title="Duplicar">⧉</button>
                <button type="button" onClick={() => { touch(); setBlocks(bs => bs.map((x, j) => j === i ? { ...x, hidden: !x.hidden } : x)); }} aria-label={b.hidden ? 'Mostrar' : 'Ocultar'} title={b.hidden ? 'Mostrar' : 'Ocultar'}>{b.hidden ? '🙈' : '👁'}</button>
                <button type="button" onClick={() => remove(i)} aria-label="Quitar" title="Quitar">✕</button>
              </span>
            </div>
            {open === b.id && <div className="fp-block-form">
              <BlockFields b={b} set={patch => edit(i, patch)} images={d.images} hint={[d.property.neighborhood, d.property.municipality, 'Guanajuato'].filter(Boolean).join(', ')}
                loc={{ latitude: d.property.latitude ?? null, longitude: d.property.longitude ?? null, showExactLocation: !!d.property.showExactLocation }} onLoc={setLoc} />
              <label>Fondo de la sección<select value={b.bg || 'light'} onChange={e => edit(i, { bg: e.target.value as Block['bg'] })}><option value="light">Claro (fondo)</option><option value="dark">Oscuro (color principal)</option><option value="accent">Acento</option></select></label>
            </div>}
          </li>)}
            <li className={`fp-drop-end${over === blocks.length ? ' drop-here' : ''}`} onDragOver={e => { if (drag.current) { e.preventDefault(); if (over !== blocks.length) setOver(blocks.length); } }} onDrop={e => { e.preventDefault(); drop(blocks.length); }}>Suelta aquí para dejarlo al final</li>
          </ol>
        </section>
      </div>
      <div className="fp-preview" aria-label="Vista previa">
        <div className="fp-preview-bar"><span>Vista previa</span>
          <span className="fp-devices" role="group" aria-label="Tamaño de la vista previa">{([['desk', '🖥 Computadora'], ['tablet', '📱 Tableta'], ['phone', '📱 Celular']] as const).map(([k, l]) => <button key={k} type="button" className={device === k ? 'on' : ''} aria-pressed={device === k} onClick={() => setDevice(k)}>{l}</button>)}</span></div>
        <div className={`fp-device fp-device-${device}`}><FanpageView property={d.property} theme={theme} blocks={blocks} preview /></div>
      </div>
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
    <div className="fp-bar" role="toolbar" aria-label="Guardar y publicar">
      <span className={`fp-save-state ${saveState}`} role="status">{dirty ? (saveState === 'saving' ? 'Guardando…' : saveState === 'error' ? '⚠ No se pudo guardar' : 'Cambios sin guardar…') : saveState === 'saved' ? '✓ Borrador guardado' : d.unpublishedChanges && d.status !== 'PENDING' ? 'Borrador sin publicar' : 'Todo al día'}</span>
      <button type="button" className="button button-ghost" onClick={undo} disabled={!hist.current.past.length} title="Deshacer (Ctrl+Z)">↶ Deshacer</button>
      <button type="button" className="button button-ghost" onClick={redo} disabled={!hist.current.future.length} title="Rehacer (Ctrl+Mayús+Z)">↷ Rehacer</button>
      <button type="button" className="button button-outline" disabled={busy || !dirty} onClick={save}>Guardar ahora</button>
      <button type="button" className="button button-gold" disabled={busy || (d.status === 'PENDING' && !dirty) || (!dirty && !d.unpublishedChanges && d.hasPublished)} onClick={publish}>{d.requireApproval ? 'Enviar a aprobación' : 'Publicar'}</button>
      {d.property.status === 'PUBLISHED' && <a className="button button-outline light" href={publicPath} target="_blank" rel="noopener noreferrer">Ver pública ↗</a>}
    </div>
  </main>;
}

export default function Page() {
  return <ProtectedPanel allowed={['AGENT', 'AGENCY', 'DEVELOPER', 'ADMIN']}>{user => <FanpageEditor user={user} />}</ProtectedPanel>;
}
