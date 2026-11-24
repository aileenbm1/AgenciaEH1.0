"use client";
import React, { CSSProperties } from 'react';
import Link from 'next/link';
import { PropertyGrid } from '@/components/property-grid';
import { SectionTitle } from '@/components/section-title';
import { Property } from '@/lib/data';
import { SiteA } from '@/components/site-link';
import { MUNICIPALITIES, PROPERTY_TYPES } from '@/lib/roles';
import { Home, ShieldCheck, Users, Star, Handshake, FileCheck2, MapPin, KeyRound, Heart, Building2, Clock, Sparkles } from 'lucide-react';
import { rgba, SiteBlock, SiteConfig, SiteLink, videoSrc, waLink } from '@/lib/site';

const HERO_IMG = 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1800';

const ICONS: Record<string, typeof Home> = { casa: Home, escudo: ShieldCheck, personas: Users, estrella: Star, saludo: Handshake, documento: FileCheck2, ubicacion: MapPin, llave: KeyRound, corazon: Heart, edificio: Building2, reloj: Clock, brillo: Sparkles };
const btn = (l: SiteLink | undefined, className: string) => (l?.label && l?.href ? <SiteA href={l.href} className={className}>{l.label}</SiteA> : null);
const Head = ({ b }: { b: SiteBlock }) => (b.eyebrow || b.title || b.copy ? <SectionTitle eyebrow={b.eyebrow || ''} title={b.title || ''} copy={b.copy || undefined} /> : null);
const paragraphs = (s: string) => String(s || '').split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>);

/** Hooks del editor sobre la vista previa: seleccionar, mover, duplicar, ocultar y quitar bloques. */
export type SiteEditorHooks = {
  selected: string; over: number | null;
  onSelect: (id: string) => void; onMove: (i: number, dir: -1 | 1) => void; onDuplicate: (i: number) => void; onToggle: (i: number) => void; onRemove: (i: number) => void;
  onDragStart: (i: number) => void; onDragEnd: () => void; onDragOver: (at: number) => void; onDrop: (at: number) => void; dragging: () => boolean;
};

type Props = { blocks: SiteBlock[]; site: SiteConfig; featured?: Record<string, { items: Property[]; total: number }>; editor?: SiteEditorHooks };

/**
 * Dibuja una página del sitio a partir de bloques. Todo el texto se muestra como
 * texto (React lo escapa); ningún bloque inserta HTML ni CSS.
 */
export default function SiteBlocks({ blocks, site, featured = {}, editor }: Props) {
  const primary = site.theme.primary;

  function render(b: SiteBlock): React.ReactNode {
    const bgCls = b.bg === 'soft' ? ' soft' : b.bg === 'dark' ? ' site-dark' : b.bg === 'accent' ? ' site-accent' : '';
    switch (b.type) {
      case 'hero': {
        const style = { background: `linear-gradient(${rgba(primary, 0.66)},${rgba(primary, 0.66)}),url('${b.imageUrl || HERO_IMG}') center/cover` } as CSSProperties;
        return <section className={`hero${b.showSearch ? '' : ' hero-solo'}`} style={style}>
          <div className="hero-copy">
            {b.eyebrow && <span className="eyebrow light">{b.eyebrow}</span>}
            <h1>{b.title}{b.highlight && <><br /><em>{b.highlight}</em></>}</h1>
            {b.text && <p>{b.text}</p>}
            {(b.button1?.label || b.button2?.label) && <div className="hero-actions">{btn(b.button1, 'button button-gold')}{btn(b.button2, 'text-link light-link')}</div>}
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
      case 'paths': return <section className={`content-section${bgCls}`}><Head b={b} />
        <div className="path-grid">{(b.cards || []).map((c: any, i: number) => {
          const inner = <>{c.badge && <span className="role-badge">{c.badge}</span>}<h3>{c.title}</h3>{c.text && <p>{c.text}</p>}{c.linkText && <span className="path-cta">{c.linkText}</span>}</>;
          return c.href ? <SiteA key={i} href={c.href} className="path-card">{inner}</SiteA> : <div key={i} className="path-card">{inner}</div>;
        })}</div></section>;
      case 'values': return <section className={`content-section${bgCls}`}><Head b={b} />
        <div className={`site-values ${b.layout === 'row' ? 'is-row' : 'is-cards'}`}>{(b.items || []).map((x: any, i: number) => { const Icon = ICONS[x.icon] || Home; return <div key={i} className="site-value">
          <span className="site-value-ic"><Icon size={26} strokeWidth={1.5} aria-hidden /></span><b>{x.title}</b>{x.text && <p>{x.text}</p>}</div>; })}</div></section>;
      case 'cities': return <section className={`content-section${bgCls}`}><Head b={b} />
        <div className="city-chips">{MUNICIPALITIES.map(c => <Link href={`/propiedades?municipality=${encodeURIComponent(c)}`} key={c}>{c} <span>↗</span></Link>)}</div></section>;
      case 'featured': {
        const f = featured[b.id];
        const href = b.operation ? `/propiedades?operation=${b.operation}` : '/propiedades';
        return <section className={`content-section${bgCls}`}><Head b={b} />
          {f ? <PropertyGrid items={f.items} /> : <p className="muted">Cargando propiedades…</p>}
          {f && f.total === 0 && b.emptyText && <p className="muted">{b.emptyText}</p>}
          {b.buttonText && <div className="center"><Link className="button button-outline" href={href}>{b.buttonText}</Link></div>}
        </section>;
      }
      case 'banner': return <section className={`owner-cta${b.bg === 'accent' ? ' site-accent' : b.bg === 'light' ? ' site-light' : b.bg === 'soft' ? ' site-light soft' : ''}`}>
        <div>
          {b.eyebrow && <span className="eyebrow light">{b.eyebrow}</span>}
          <h2>{b.title}{b.highlight && <><br /><em>{b.highlight}</em></>}</h2>
          {b.text && <p>{b.text}</p>}
        </div>
        {btn(b.button, 'button button-gold')}
      </section>;
      case 'text': return <section className={`content-section site-text${bgCls}${b.align === 'center' ? ' is-center' : ''}`}><Head b={b} />
        {b.body && <div className="site-body">{paragraphs(b.body)}</div>}
        {btn(b.button, 'button button-navy')}</section>;
      case 'steps': return <section className={`content-section${bgCls}`}><Head b={b} />
        <ol className="flow-steps">{(b.items || []).map((x: any, i: number) => <li key={i}><span className="step-num">{i + 1}</span><div><b>{x.title}</b>{x.text && <p>{x.text}</p>}</div></li>)}</ol></section>;
      case 'faq': return <section className={`content-section${bgCls}`}><Head b={b} />
        <div className="faq">{(b.items || []).map((x: any, i: number) => <details key={i}><summary>{x.q}</summary>{paragraphs(x.a)}</details>)}</div></section>;
      case 'image': return b.imageUrl ? <section className={`content-section${bgCls}`}><Head b={b} />
        <figure className={`site-figure${b.wide ? ' wide' : ''}`}><img src={b.imageUrl} alt={b.caption || b.title || 'Imagen'} loading="lazy" />{b.caption && <figcaption>{b.caption}</figcaption>}</figure></section> : null;
      case 'gallery': return (b.images || []).length ? <section className={`content-section${bgCls}`}><Head b={b} />
        <div className="site-gallery">{b.images.map((u: string, i: number) => <a key={u + i} href={u} target="_blank" rel="noopener noreferrer"><img src={u} alt={`Foto ${i + 1}`} loading="lazy" /></a>)}</div></section> : null;
      case 'video': { const src = videoSrc(b); return src ? <section className={`content-section${bgCls}`}><Head b={b} />
        <div className="fp-video site-video"><iframe src={src} title={b.title || 'Video'} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen /></div></section> : null; }
      case 'contact': {
        const mail = b.showEmail && site.contact.email ? `mailto:${site.contact.email}?subject=${encodeURIComponent(b.subject || '')}&body=${encodeURIComponent(b.message || '')}` : '';
        const wa = b.showWhatsapp ? waLink(site.contact.whatsapp, b.message || '') : '';
        return <section className={`content-section${bgCls}`}><Head b={b} />
          {mail || wa ? <div className="property-actions">
            {mail && <a className="button button-navy" href={mail}>{b.emailText || 'Escribir por correo'}</a>}
            {wa && <a className="button button-outline" href={wa} target="_blank" rel="noopener noreferrer">{b.whatsappText || 'Escribir por WhatsApp'}</a>}
          </div> : editor ? <p className="muted">Escribe el correo o el WhatsApp de contacto en la pestaña “Encabezado y pie” para que aparezcan los botones.</p> : null}
        </section>;
      }
    }
    return null;
  }

  return <>{blocks.map((b, i) => {
    if (b.hidden && !editor) return null;
    const el = render(b) || (editor ? <section className="content-section"><p className="muted">Este bloque aún no tiene contenido que mostrar (agrega una foto, video o texto).</p></section> : null);
    if (!el) return null;
    if (!editor) return <React.Fragment key={b.id}>{el}</React.Fragment>;
    const at = (e: React.DragEvent) => { const r = e.currentTarget.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? i : i + 1; };
    return <div key={b.id} className={`site-editable${b.hidden ? ' is-hidden' : ''}${editor.selected === b.id ? ' is-selected' : ''}${editor.over === i ? ' drop-before' : ''}${editor.over === i + 1 && i === blocks.length - 1 ? ' drop-after' : ''}`}
      onClickCapture={e => { const t = e.target as HTMLElement; if (t.closest('.fp-tools')) return; if (t.closest('a,button,summary')) e.preventDefault(); editor.onSelect(b.id); }}
      onDragOver={e => { if (editor.dragging()) { e.preventDefault(); editor.onDragOver(at(e)); } }} onDrop={e => { e.preventDefault(); editor.onDrop(at(e)); }}>
      <div className="fp-tools" role="toolbar" aria-label="Acciones del bloque">
        <span className="fp-tool-grip" draggable title="Arrastrar para mover" onDragStart={e => { editor.onDragStart(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); }} onDragEnd={editor.onDragEnd}>⋮⋮ Mover</span>
        <button type="button" onClick={() => editor.onMove(i, -1)} disabled={i === 0} title="Subir" aria-label="Subir">▲</button>
        <button type="button" onClick={() => editor.onMove(i, 1)} disabled={i === blocks.length - 1} title="Bajar" aria-label="Bajar">▼</button>
        <button type="button" onClick={() => editor.onDuplicate(i)} title="Duplicar" aria-label="Duplicar">⧉</button>
        <button type="button" onClick={() => editor.onToggle(i)} title={b.hidden ? 'Mostrar' : 'Ocultar'} aria-label={b.hidden ? 'Mostrar' : 'Ocultar'}>{b.hidden ? '🙈' : '👁'}</button>
        <button type="button" onClick={() => editor.onRemove(i)} title="Quitar" aria-label="Quitar">✕</button>
      </div>
      {el}
    </div>;
  })}</>;
}
