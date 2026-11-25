"use client";
import React, { CSSProperties } from 'react';
import Link from 'next/link';
import { PropertyGrid } from '@/components/property-grid';
import { SectionTitle } from '@/components/section-title';
import { Property } from '@/lib/data';
import { SiteA } from '@/components/site-link';
import { MUNICIPALITIES, PROPERTY_TYPES } from '@/lib/roles';
import { Home, ShieldCheck, Users, Star, Handshake, FileCheck2, MapPin, KeyRound, Heart, Building2, Clock, Sparkles } from 'lucide-react';
import { focusXY, layoutOf, rgba, SITE_BLOCKS, SiteBlock, SiteConfig, SiteLink, videoSrc, waLink } from '@/lib/site';
import SiteGallery, { GalleryOptions } from '@/components/site-gallery';

const HERO_IMG = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1800';

const ICONS: Record<string, typeof Home> = { casa: Home, escudo: ShieldCheck, personas: Users, estrella: Star, saludo: Handshake, documento: FileCheck2, ubicacion: MapPin, llave: KeyRound, corazon: Heart, edificio: Building2, reloj: Clock, brillo: Sparkles };
const btn = (l: SiteLink | undefined, className: string) => (l?.label && l?.href ? <SiteA href={l.href} className={className}>{l.label}</SiteA> : null);
const Head = ({ b }: { b: SiteBlock }) => (b.eyebrow || b.title || b.copy ? <SectionTitle eyebrow={b.eyebrow || ''} title={b.title || ''} copy={b.copy || undefined} /> : null);
const paragraphs = (s: string) => String(s || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>);

/** Hooks del editor sobre la vista previa: seleccionar, mover, duplicar, ocultar y quitar bloques. */
export type SiteEditorHooks = {
  selected: string; over: number | null; phone?: boolean;
  onText: (i: number, path: string, value: string) => void; onInsert: (at: number) => void;
  onSelect: (id: string) => void; onMove: (i: number, dir: -1 | 1) => void; onDuplicate: (i: number) => void; onToggle: (i: number) => void; onRemove: (i: number) => void;
  onDragStart: (i: number) => void; onDragEnd: () => void; onDragOver: (at: number) => void; onDrop: (at: number) => void; dragging: () => boolean;
};

const EditorCtx = React.createContext<SiteEditorHooks | undefined>(undefined);

/** Texto editable sobre la página (solo en el editor). Se guarda como texto plano: nunca HTML. */
function Ed({ i, path, value, max, multi = false, ph = 'Escribe aquí…', as: Tag = 'span', className }: { i: number; path: string; value: string; max: number; multi?: boolean; ph?: string; as?: 'span' | 'div' | 'p' | 'b' | 'h1' | 'h2' | 'h3' | 'em'; className?: string }) {
const editor = React.useContext(EditorCtx);
if (!editor) return value ? <Tag className={className}>{value}</Tag> : null;
  return <Tag key={value} className={`se-inline${className ? ' ' + className : ''}`} contentEditable suppressContentEditableWarning data-ph={ph} spellCheck
    onBlur={e => { const v = (e.currentTarget.innerText || '').replace(/\u00a0/g, ' ').replace(multi ? /\n{3,}/g : /\s*\n\s*/g, multi ? '\n\n' : ' ').trim().slice(0, max); if (v !== value) editor.onText(i, path, v); }}
    onKeyDown={e => { if (!multi && e.key === 'Enter') { e.preventDefault(); e.currentTarget.blur(); } if (e.key === ' ') e.stopPropagation(); }}
    onKeyUp={e => e.key === ' ' && e.preventDefault()}
    onPaste={e => { e.preventDefault(); document.execCommand('insertText', false, e.clipboardData.getData('text/plain')); }}>{value}</Tag>;
}

type Props = { blocks: SiteBlock[]; site: SiteConfig; featured?: Record<string, { items: Property[]; total: number }>; editor?: SiteEditorHooks };

/**
 * Dibuja una página del sitio a partir de bloques. Todo el texto se muestra como
 * texto (React lo escapa); ningún bloque inserta HTML ni CSS.
 */
export default function SiteBlocks({ blocks, site, featured = {}, editor }: Props) {
  const primary = site.theme.primary;

  const eBtn = (i: number, k: string, l: SiteLink | undefined, className: string) => editor
    ? (l?.label || editor.selected === blocks[i]?.id ? <span className={className}><Ed i={i} path={`${k}.label`} value={l?.label || ''} max={40} ph="Texto del botón" /></span> : null)
    : btn(l, className);
  const eHead = (i: number, b: SiteBlock) => editor
    ? (b.eyebrow || b.title || b.copy || editor.selected === b.id ? <div className="section-title"><Ed i={i} path="eyebrow" value={b.eyebrow || ''} max={80} ph="FRASE PEQUEÑA (opcional)" className="eyebrow" /><Ed i={i} path="title" value={b.title || ''} max={160} ph="Título" as="h2" /><Ed i={i} path="copy" value={b.copy || ''} max={400} ph="Texto bajo el título (opcional)" as="p" /></div> : null)
    : <Head b={b} />;
  const eParas = (i: number, path: string, v: string, max: number) => editor ? <Ed i={i} path={path} value={v} max={max} multi as="div" className="se-paras" ph="Escribe aquí. Deja una línea en blanco entre párrafos." /> : paragraphs(v);

  function render(b: SiteBlock, i: number): React.ReactNode {
    const bgCls = b.bg === 'soft' ? ' soft' : b.bg === 'dark' ? ' site-dark' : b.bg === 'accent' ? ' site-accent' : '';
    switch (b.type) {
      case 'hero': {
        const style = { background: `linear-gradient(${rgba(primary, 0.66)},${rgba(primary, 0.66)}),url('${b.imageUrl || HERO_IMG}') ${focusXY(b.focus)}/cover` } as CSSProperties;
        return <section className={`hero${b.showSearch ? '' : ' hero-solo'}`} style={style}>
          <div className="hero-copy">
            {(b.eyebrow || editor) && <Ed i={i} path="eyebrow" value={b.eyebrow || ''} max={80} ph="FRASE PEQUEÑA" className="eyebrow light" />}
            <h1><Ed i={i} path="title" value={b.title || ''} max={160} ph="Título principal" />{(b.highlight || editor) && <><br /><Ed i={i} path="highlight" value={b.highlight || ''} max={120} ph="segunda línea" as="em" /></>}</h1>
            {(b.text || editor) && (editor ? <Ed i={i} path="text" value={b.text || ''} max={400} ph="Texto de presentación" as="p" /> : <p>{b.text}</p>)}
            {(b.button1?.label || b.button2?.label || editor) && <div className="hero-actions">{eBtn(i, 'button1', b.button1, 'button button-gold')}{eBtn(i, 'button2', b.button2, 'text-link light-link')}</div>}
          </div>
          {b.showSearch && <form className="search-panel" action="/propiedades" method="get" onSubmit={editor ? e => e.preventDefault() : undefined}>
            <div className="search-heading"><b>{b.searchTitle || 'Encuentra tu próximo espacio'}</b>{b.searchNote && <span>{b.searchNote}</span>}</div>
            <div className="operation-tabs" role="radiogroup" aria-label="Operación">
              <label><input type="radio" name="operation" value="RENT" defaultChecked />Rentar</label>
              <label><input type="radio" name="operation" value="SALE" />Comprar</label>
            </div>
            <div className="search-fields">
              <label>Municipio<select name="municipality" defaultValue=""><option value="">Todos los municipios</option>{MUNICIPALITIES.map(c => <option key={c}>{c}</option>)}</select></label>
              <label>Tipo de inmueble<select name="propertyType" defaultValue=""><option value="">Cualquier tipo</option>{PROPERTY_TYPES.map(t => <option key={t}>{t}</option>)}</select></label>
              <label>Precio máximo (MXN)<input name="maxPrice" type="number" min="0" step="1000" placeholder="Sin límite" /></label>
            </div>
            <button className="button button-navy full" type="submit">Buscar propiedades</button>
          </form>}
        </section>;
      }
      case 'paths': return <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <div className="path-grid">{(b.cards || []).map((c: any, k: number) => {
          const inner = <>{(c.badge || editor) && <Ed i={i} path={`cards.${k}.badge`} value={c.badge || ''} max={40} ph="Etiqueta" className="role-badge" />}<Ed i={i} path={`cards.${k}.title`} value={c.title || ''} max={80} ph="Título" as="h3" />{(c.text || editor) && <Ed i={i} path={`cards.${k}.text`} value={c.text || ''} max={300} ph="Texto" as="p" />}{(c.linkText || editor) && <Ed i={i} path={`cards.${k}.linkText`} value={c.linkText || ''} max={50} ph="Ver más →" className="path-cta" />}</>;
          return c.href && !editor ? <SiteA key={k} href={c.href} className="path-card">{inner}</SiteA> : <div key={k} className="path-card">{inner}</div>;
        })}</div></section>;
      case 'values': return <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <div className={`site-values ${b.layout === 'row' ? 'is-row' : 'is-cards'}`}>{(b.items || []).map((x: any, k: number) => { const Icon = ICONS[x.icon] || Home; return <div key={k} className="site-value">
          <span className="site-value-ic"><Icon size={26} strokeWidth={1.5} aria-hidden /></span><Ed i={i} path={`items.${k}.title`} value={x.title || ''} max={60} ph="Título" as="b" />{(x.text || editor) && <Ed i={i} path={`items.${k}.text`} value={x.text || ''} max={240} ph="Texto (opcional)" as="p" />}</div>; })}</div></section>;
      case 'cities': return <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <div className="city-chips">{MUNICIPALITIES.map(c => <Link href={`/propiedades?municipality=${encodeURIComponent(c)}`} key={c}>{c} <span>↗</span></Link>)}</div></section>;
      case 'featured': {
        const f = featured[b.id];
        const href = b.operation ? `/propiedades?operation=${b.operation}` : '/propiedades';
        return <section className={`content-section${bgCls}`}>{eHead(i, b)}
          {f ? <PropertyGrid items={f.items} /> : <p className="muted">Cargando propiedades…</p>}
          {f && f.total === 0 && b.emptyText && <p className="muted">{b.emptyText}</p>}
          {b.buttonText && <div className="center"><Link className="button button-outline" href={href}>{b.buttonText}</Link></div>}
        </section>;
      }
      case 'banner': return <section className={`owner-cta${b.bg === 'accent' ? ' site-accent' : b.bg === 'light' ? ' site-light' : b.bg === 'soft' ? ' site-light soft' : ''}`}>
        <div>
          {(b.eyebrow || editor) && <Ed i={i} path="eyebrow" value={b.eyebrow || ''} max={80} ph="FRASE CORTA" className="eyebrow light" />}
          <h2><Ed i={i} path="title" value={b.title || ''} max={160} ph="Título" />{(b.highlight || editor) && <><br /><Ed i={i} path="highlight" value={b.highlight || ''} max={120} ph="segunda línea (opcional)" as="em" /></>}</h2>
          {(b.text || editor) && <Ed i={i} path="text" value={b.text || ''} max={500} ph="Texto (opcional)" as="p" />}
        </div>
        {eBtn(i, 'button', b.button, 'button button-gold')}
      </section>;
      case 'text': return <section className={`content-section site-text${bgCls}${b.align === 'center' ? ' is-center' : ''}`}>{eHead(i, b)}
        {(b.body || editor) && <div className="site-body">{eParas(i, 'body', b.body || '', 6000)}</div>}
        {eBtn(i, 'button', b.button, 'button button-navy')}</section>;
      case 'steps': return <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <ol className="flow-steps">{(b.items || []).map((x: any, k: number) => <li key={k}><span className="step-num">{k + 1}</span><div><Ed i={i} path={`items.${k}.title`} value={x.title || ''} max={80} ph="Paso" as="b" />{(x.text || editor) && <Ed i={i} path={`items.${k}.text`} value={x.text || ''} max={300} ph="Texto (opcional)" as="p" />}</div></li>)}</ol></section>;
      case 'faq': return <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <div className="faq">{(b.items || []).map((x: any, k: number) => editor
          ? <div key={k} className="faq-edit"><Ed i={i} path={`items.${k}.q`} value={x.q || ''} max={200} ph="¿Pregunta?" as="b" />{eParas(i, `items.${k}.a`, x.a || '', 1500)}</div>
          : <details key={k}><summary>{x.q}</summary>{paragraphs(x.a)}</details>)}</div></section>;
      case 'image': return b.imageUrl ? <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <figure className={`site-figure${b.wide ? ' wide' : ''}`}><img src={b.imageUrl} alt={b.caption || b.title || 'Imagen'} loading="lazy" style={b.focus ? { objectPosition: focusXY(b.focus) } : undefined} />{(b.caption || editor) && <Ed i={i} path="caption" value={b.caption || ''} max={200} ph="Texto al pie (opcional)" as="p" className="site-caption" />}</figure></section> : null;
      case 'gallery': return (b.images || []).length ? <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <SiteGallery images={b.images} names={b.names || []} title={b.title || 'Galería'} editing={!!editor} o={b as GalleryOptions} /></section> : null;
      case 'video': { const src = videoSrc(b); return src ? <section className={`content-section${bgCls}`}>{eHead(i, b)}
        <div className="fp-video site-video"><iframe src={src} title={b.title || 'Video'} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen /></div></section> : null; }
      case 'contact': {
        const mail = b.showEmail && site.contact.email ? `mailto:${site.contact.email}?subject=${encodeURIComponent(b.subject || '')}&body=${encodeURIComponent(b.message || '')}` : '';
        const wa = b.showWhatsapp ? waLink(site.contact.whatsapp, b.message || '') : '';
        return <section className={`content-section${bgCls}`}>{eHead(i, b)}
          {mail || wa ? <div className="property-actions">
            {mail && <a className="button button-navy" href={mail}>{b.emailText || 'Escribir por correo'}</a>}
            {wa && <a className="button button-outline" href={wa} target="_blank" rel="noopener noreferrer">{b.whatsappText || 'Escribir por WhatsApp'}</a>}
          </div> : editor ? <p className="muted">Escribe el correo o el WhatsApp de contacto en la pestaña “Encabezado y pie” para que aparezcan los botones.</p> : null}
        </section>;
      }
    }
    return null;
  }

  const ins = (at: number) => editor ? <div className="se-ins" key={`ins-${at}`}><button type="button" onClick={() => editor.onInsert(at)} aria-label="Agregar una sección aquí" title="Agregar una sección aquí">+</button></div> : null;
  return <EditorCtx.Provider value={editor}>{blocks.map((b, i) => {
    if (b.hidden && !editor) return null;
    let el = render(b, i) || (editor ? <section className="content-section"><p className="muted">Este bloque aún no tiene contenido que mostrar (agrega una foto, video o texto en el panel de la derecha).</p></section> : null);
    if (!el) return null;
    // Acomodo exacto (posición, alineación, ancho, alto y espacio): clases fijas, nunca CSS escrito por el usuario.
    const lay = layoutOf(b);
    if (lay.className && React.isValidElement(el)) {
      const props = el.props as { className?: string; style?: CSSProperties };
      el = React.cloneElement(el as React.ReactElement<{ className?: string; style?: CSSProperties }>, { className: `${props.className || ''} ${lay.className}`, style: { ...(props.style || {}), ...lay.style } as CSSProperties });
    }
    if (!editor) return <React.Fragment key={b.id}>{el}</React.Fragment>;
    const at = (e: React.DragEvent) => { const r = e.currentTarget.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? i : i + 1; };
    const meta = SITE_BLOCKS[b.type];
    return <React.Fragment key={b.id}>{ins(i)}<div id={`blk-${b.id}`} className={`site-editable${b.hidden ? ' is-hidden' : ''}${editor.selected === b.id ? ' is-selected' : ''}${editor.over === i ? ' drop-before' : ''}${editor.over === i + 1 && i === blocks.length - 1 ? ' drop-after' : ''}`}
      onClickCapture={e => { const t = e.target as HTMLElement; if (t.closest('.fp-tools')) return; if (t.closest('a,button,summary') && !t.closest('.sg-arr,.sg-thumbs,.sg-dots')) e.preventDefault(); editor.onSelect(b.id); }}
      onDragOver={e => { if (editor.dragging()) { e.preventDefault(); editor.onDragOver(at(e)); } }} onDrop={e => { e.preventDefault(); editor.onDrop(at(e)); }}>
      <div className="fp-tools se-tools" role="toolbar" aria-label="Acciones del bloque">
        <span className="se-tool-name">{meta?.icon} {meta?.label}{b.hidden ? ' · oculto' : ''}</span>
        <span className="fp-tool-grip" draggable title="Arrastrar para mover" onDragStart={e => { editor.onDragStart(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); }} onDragEnd={editor.onDragEnd}>⠿</span>
        <button type="button" onClick={() => editor.onMove(i, -1)} disabled={i === 0} title="Subir" aria-label="Subir">↑</button>
        <button type="button" onClick={() => editor.onMove(i, 1)} disabled={i === blocks.length - 1} title="Bajar" aria-label="Bajar">↓</button>
        <button type="button" onClick={() => editor.onDuplicate(i)} title="Duplicar" aria-label="Duplicar">⧉</button>
        <button type="button" onClick={() => editor.onToggle(i)} title={b.hidden ? 'Mostrar' : 'Ocultar'} aria-label={b.hidden ? 'Mostrar' : 'Ocultar'}>{b.hidden ? '🙈' : '👁'}</button>
        <button type="button" onClick={() => editor.onRemove(i)} title="Quitar" aria-label="Quitar">🗑</button>
      </div>
      {el}
    </div>{i === blocks.length - 1 && ins(blocks.length)}</React.Fragment>;
  })}{editor && blocks.length === 0 && ins(0)}</EditorCtx.Provider>;
}
