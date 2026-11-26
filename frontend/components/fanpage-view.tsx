"use client";
import React, { CSSProperties, useEffect, useState } from 'react';
import { Briefcase, Bus, Church, Dumbbell, GraduationCap, Landmark, MapPin, ShoppingBag, ShoppingCart, Stethoscope, Trees, UtensilsCrossed } from 'lucide-react';
import Link from 'next/link';
import { ApiProperty, OPERATION_LABEL } from '@/lib/properties';
import { mxn } from '@/lib/data';
import { Block, fill, FONTS, monthlyPayment, Theme, tourEmbed, videoEmbed } from '@/lib/fanpage';
import PropertyContact from './property-contact';
import ShareButtons from './share-buttons';
import PropertyMap from './property-map';
import ReservationWidget from './reservation-widget';
import { reviewProperty } from '@/lib/reservations';
import { focusXY, layoutOf, SiteBlock } from '@/lib/site';
import SiteGallery, { GalleryOptions } from './site-gallery';

type Track = (kind: 'VIEW' | 'SHARE' | 'CTA', channel?: string) => void;
const NEAR_IC: Record<string, typeof MapPin> = { escuela: GraduationCap, super: ShoppingCart, hospital: Stethoscope, parque: Trees, plaza: ShoppingBag, transporte: Bus, restaurante: UtensilsCrossed, gimnasio: Dumbbell, banco: Landmark, iglesia: Church, trabajo: Briefcase, otro: MapPin };

/** Calculadora de crédito: el visitante mueve el enganche y el plazo; la tasa la pone el asesor. */
function Mortgage({ price, downPct, years, rate, note }: { price: number; downPct: number; years: number; rate: number; note?: string }) {
  const [down, setDown] = useState(downPct), [yrs, setYrs] = useState(years);
  const loan = price * (1 - down / 100), pay = monthlyPayment(loan, rate, yrs);
  return <div className="fp-calc">
    <label>Enganche: <b>{down}%</b> ({mxn(price * down / 100)})<input type="range" min={5} max={90} step={5} value={down} onChange={e => setDown(Number(e.target.value))} /></label>
    <label>Plazo: <b>{yrs} años</b><input type="range" min={5} max={30} step={1} value={yrs} onChange={e => setYrs(Number(e.target.value))} /></label>
    <div className="fp-calc-out"><span>Mensualidad aproximada</span><b>{mxn(pay)}</b><small>Crédito de {mxn(loan)} · tasa de referencia {rate}% anual</small></div>
    {note && <p className="fp-note">{note}</p>}
  </div>;
}
const waNumber = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `52${d}` : d; };

/**
 * Dibuja una fanpage a partir de bloques. Todo el texto se muestra como texto
 * (React lo escapa); no existe ningún bloque que inserte HTML o CSS.
 * preview = vista previa del editor: sin estadísticas ni envíos.
 */
/** Controles del editor sobre la vista previa: seleccionar, mover (arrastrando o con flechas), duplicar, ocultar y quitar. */
export type FanpageEditorHooks = {
  selected: string; over: number | null;
  onSelect: (id: string) => void; onMove: (i: number, dir: -1 | 1) => void; onDuplicate: (i: number) => void; onToggle: (i: number) => void; onRemove: (i: number) => void;
  onDragStart: (i: number) => void; onDragEnd: () => void; onDragOver: (at: number) => void; onDrop: (at: number) => void; dragging: () => boolean;
};

export default function FanpageView({ property: p, theme, blocks, preview = false, campaign, source, editor }: { property: ApiProperty; theme: Theme; blocks: Block[]; preview?: boolean; campaign?: string; source?: string; editor?: FanpageEditorHooks }) {
  const track: Track = (kind, channel) => {
    if (preview) return;
    fetch(`/api/v1/fanpages/public/${encodeURIComponent(p.slug)}/events`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ kind, channel: channel || source, campaign }), keepalive: true }).catch(() => {});
  };
  useEffect(() => {
    if (preview) return;
    let ref = 'directo'; try { if (document.referrer) { const h = new URL(document.referrer).hostname; if (h !== location.hostname) ref = h.replace(/^www\./, ''); } } catch { /* sin referente */ }
    track('VIEW', source || ref);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const font = FONTS[theme.font] || FONTS.clasica;
  const style = { '--fp-primary': theme.primary, '--fp-accent': theme.accent, '--fp-bg': theme.background, '--fp-text': theme.text, '--fp-title': font.title, '--fp-body': font.body } as CSSProperties;
  const photos = (p.images || []).map(i => i.url);
  const wa = p.owner?.phone ? `https://wa.me/${waNumber(p.owner.phone)}?text=${encodeURIComponent(`Hola, vi "${p.title}" y me interesa.`)}` : null;
  const isRent = p.operation === 'RENT', both = p.operation === 'BOTH';
  const closed = p.availability === 'RENTED' || p.availability === 'SOLD';

  function button(b: Block) {
    if (!b.buttonText) return null;
    const onClick = () => track('CTA', b.target);
    const t = b.target as string;
    if (t === 'whatsapp' && wa) return <a className="fp-button" href={preview ? undefined : wa} target="_blank" rel="noopener noreferrer" onClick={onClick}>{b.buttonText}</a>;
    if (t === 'reserve') return <Link className="fp-button" href={`/propiedades/${p.slug}#reservar`} onClick={onClick}>{b.buttonText}</Link>;
    if (t === 'property') return <Link className="fp-button" href={`/propiedades/${p.slug}`} onClick={onClick}>{b.buttonText}</Link>;
    return <a className="fp-button" href="#fp-contacto" onClick={onClick}>{b.buttonText}</a>;
  }

  function render(b: Block) {
    switch (b.type) {
      case 'hero': {
        const img = b.imageUrl || photos[0];
        const lay = layoutOf(b as SiteBlock);
        return <div className={`fp-hero-in ${lay.className}`} style={{ ...(img ? { backgroundImage: `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.55)), url("${encodeURI(img)}")`, backgroundPosition: focusXY(b.focus) } : {}), ...lay.style } as CSSProperties}>
          <span className="fp-eyebrow">{OPERATION_LABEL[p.operation].toUpperCase()} · {p.municipality.toUpperCase()}</span>
          <h1>{fill(b.title, p)}</h1>{b.subtitle && <p>{fill(b.subtitle, p)}</p>}
          {closed ? <p className="fp-badge">Ya no disponible</p> : button(b)}
        </div>;
      }
      case 'text': return <div className={`fp-inner fp-text ${b.align === 'center' ? 'center' : b.align === 'right' ? 'right' : ''}`}>{b.title && <h2>{fill(b.title, p)}</h2>}{fill(b.body, p).split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>;
      case 'gallery': {
        const list: string[] = b.useProperty || !b.images?.length ? photos : b.images;
        if (!list.length) return null;
        // El nombre de cada foto sale de su etiqueta en la propiedad (Sala, Cocina…).
        const labels = new Map((p.images || []).map(i => [i.url, i.label || ''] as [string, string]));
        const o = { ...b, style: b.style || (b.layout === 'mosaic' ? 'mosaic' : 'grid') } as GalleryOptions;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<SiteGallery images={list} names={list.map(u => labels.get(u) || '')} title={p.title} editing={preview} o={o} /></div>;
      }
      case 'features': {
        const auto = b.auto ? [
          p.bedrooms ? `${p.bedrooms} recámara(s)` : '', p.bathrooms ? `${p.bathrooms} baño(s)` : '',
          p.builtArea ? `${Number(p.builtArea)} m² de construcción` : '', p.landArea ? `${Number(p.landArea)} m² de terreno` : '',
          p.propertyType, p.category || '', ...(p.customFields || []).filter(f => p.custom?.[f.key]).map(f => f.type === 'BOOLEAN' ? (p.custom![f.key] === '1' ? f.label : '') : `${f.label}: ${p.custom![f.key]}`),
        ].filter(Boolean) : [];
        const items = [...auto, ...(b.items || []).map((x: string) => fill(x, p))];
        if (!items.length) return null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<ul className="fp-features">{items.map((x, i) => <li key={i}>{x}</li>)}</ul></div>;
      }
      case 'price': return <div className="fp-inner fp-price">{b.title && <h2>{fill(b.title, p)}</h2>}
        {p.priceMode === 'HIDE' || !(Number(p.price) > 0) ? <><div className="fp-amount small">Precio a consultar</div>{!closed && <a className="fp-button" href={preview ? undefined : '#fp-contacto'} onClick={() => track('CTA', 'ask-price')}>Pídeme el precio</a>}</>
          : <div className="fp-amount">{p.priceMode === 'FROM' && <small>Desde </small>}{mxn(Number(p.price))}<small>{isRent ? ' / mes' : ' MXN'}</small></div>}
        {p.priceMode !== 'HIDE' && both && b.showRent && p.rentPrice ? <div className="fp-amount small">o renta {mxn(Number(p.rentPrice))}<small> / mes</small></div> : null}
        {b.note && <p>{fill(b.note, p)}</p>}</div>;
      case 'video': {
        const src = videoEmbed(b);
        if (!src) return preview ? <div className="fp-inner"><p className="muted">Agrega un enlace de YouTube o Vimeo.</p></div> : null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<div className="fp-video"><iframe src={src} title={b.title || 'Video'} loading="lazy" allow="fullscreen; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" /></div></div>;
      }
      case 'cta': return <div className="fp-inner fp-cta">{b.title && <h2>{fill(b.title, p)}</h2>}{b.text && <p>{fill(b.text, p)}</p>}{!closed && button(b)}</div>;
      case 'contact': return <div className="fp-inner fp-contact" id="fp-contacto">{b.title && <h2>{fill(b.title, p)}</h2>}{b.text && <p>{fill(b.text, p)}</p>}
        {preview ? <div className="fp-form-placeholder">Aquí aparece el formulario de mensaje / visita{b.showWhatsapp && wa ? ' y el botón de WhatsApp' : ''}.</div>
          : closed ? <p>Esta propiedad ya no está disponible.</p>
            : <PropertyContact propertyId={p.id} title={p.title} owner={p.owner} source="fanpage" campaign={campaign} showWhatsapp={!!b.showWhatsapp} onWhatsapp={() => track('CTA', 'whatsapp')} />}</div>;
      case 'share': return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<ShareButtons path={`/propiedades/${p.slug}/fanpage`} title={p.title} onShare={ch => track('SHARE', ch)} /></div>;
      case 'map': {
        if (p.latitude == null || p.longitude == null) return preview ? <div className="fp-inner"><p className="muted">La propiedad aún no tiene ubicación en el mapa (agrégala en “Editar propiedad”).</p></div> : null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<PropertyMap lat={Number(p.latitude)} lng={Number(p.longitude)} title={p.title} exact={!!p.showExactLocation} />{b.note && <p className="fp-note">{fill(b.note, p)}</p>}</div>;
      }
      case 'reserve': {
        if (closed) return null;
        return <div className="fp-inner fp-reserve">{b.title && <h2>{fill(b.title, p)}</h2>}{b.text && <p>{fill(b.text, p)}</p>}
          <ReservationWidget propertyId={p.id} slug={p.slug} operation={p.operation} property={reviewProperty(p)} demo={preview}
            fallback={<a className="fp-button" href="#fp-contacto" onClick={() => track('CTA', 'reserve-ask')}>Pregunta por fechas disponibles</a>} /></div>;
      }
      case 'nearby': {
        const items: { icon: string; name: string; time: string }[] = b.items || [];
        if (!items.length) return preview ? <div className="fp-inner"><p className="muted">Agrega los lugares cercanos.</p></div> : null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<ul className="fp-near">{items.map((x, i) => { const Ic = NEAR_IC[x.icon] || MapPin; return <li key={i}><span className="fp-near-ic"><Ic size={22} strokeWidth={1.6} aria-hidden /></span><b>{x.name}</b>{x.time && <small>{x.time}</small>}</li>; })}</ul></div>;
      }
      case 'faq': {
        const items: { q: string; a: string }[] = b.items || [];
        if (!items.length) return preview ? <div className="fp-inner"><p className="muted">Agrega preguntas y respuestas.</p></div> : null;
        return <div className="fp-inner fp-faq">{b.title && <h2>{fill(b.title, p)}</h2>}{items.map((x, i) => <details key={i} open={preview && i === 0}><summary>{fill(x.q, p)}</summary><p>{fill(x.a, p)}</p></details>)}</div>;
      }
      case 'tour': {
        const src = tourEmbed(b);
        if (!src) return preview ? <div className="fp-inner"><p className="muted">Pega el enlace de tu recorrido de Matterport o Kuula.</p></div> : null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<div className="fp-video fp-tour"><iframe src={src} title={b.title || 'Recorrido virtual'} loading="lazy" allow="fullscreen; xr-spatial-tracking; gyroscope; accelerometer" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div></div>;
      }
      case 'mortgage': {
        const price = Number(p.price);
        if (p.operation === 'RENT' || p.priceMode === 'HIDE' || !(price > 0)) return preview ? <div className="fp-inner"><p className="muted">La calculadora aparece solo en propiedades en venta con precio visible.</p></div> : null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<Mortgage price={price} downPct={Number(b.downPct) || 20} years={Number(b.years) || 20} rate={Number(b.rate) || 11} note={b.text} /></div>;
      }
      case 'agent': {
        const o = p.owner; if (!o) return null;
        return <div className="fp-inner fp-agent">{b.title && <h2>{fill(b.title, p)}</h2>}
          <div className="fp-agent-card">
            {o.agent?.photoUrl ? <img src={o.agent.photoUrl} alt={o.fullName} /> : <span className="fp-agent-initials" aria-hidden>{o.fullName.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>}
            <div><b>{o.fullName}</b><small>{o.role === 'AGENCY' ? 'Agencia inmobiliaria' : o.role === 'DEVELOPER' ? 'Desarrolladora' : 'Asesor inmobiliario'}</small>
              {b.text && <p>{fill(b.text, p)}</p>}
              <div className="fp-agent-actions">
                {b.showWhatsapp && wa && <a className="fp-button" href={preview ? undefined : wa} target="_blank" rel="noopener noreferrer" onClick={() => track('CTA', 'whatsapp')}>WhatsApp</a>}
                {o.agent?.slug && <Link href={`/asesores/${o.agent.slug}`}>Ver perfil →</Link>}
              </div></div>
          </div></div>;
      }
    }
    return null;
  }

  return <div className="fanpage" style={style}>
    {blocks.map((b, i) => {
      if (b.hidden) return null;
      const el = render(b) || (editor ? <div className="fp-inner"><p className="muted">Este bloque no tiene contenido que mostrar todavía.</p></div> : null);
      if (!el) return null;
      // Acomodo exacto (en la portada se aplica dentro de la foto).
      const lay = b.type === 'hero' ? { className: '', style: {} } : layoutOf(b as SiteBlock);
      const cls = `fp-block fp-sec-${b.type} bg-${b.bg || 'light'}${lay.className ? ' ' + lay.className : ''}`;
      if (!editor) return <section key={b.id} className={cls} style={lay.style as CSSProperties}>{el}</section>;
      // Posición donde caería el bloque arrastrado: antes o después, según la mitad en la que esté el cursor.
      const at = (e: React.DragEvent) => { const r = e.currentTarget.getBoundingClientRect(); return e.clientY < r.top + r.height / 2 ? i : i + 1; };
      return <section key={b.id} style={lay.style as CSSProperties} className={`${cls} fp-editable${editor.selected === b.id ? ' is-selected' : ''}${editor.over === i ? ' drop-before' : ''}${editor.over === i + 1 && i === blocks.length - 1 ? ' drop-after' : ''}`}
        onClickCapture={e => { const t = e.target as HTMLElement; if (t.closest('.fp-tools')) return; if (t.closest('a')) e.preventDefault(); editor.onSelect(b.id); }}
        onDragOver={e => { if (editor.dragging()) { e.preventDefault(); editor.onDragOver(at(e)); } }} onDrop={e => { e.preventDefault(); editor.onDrop(at(e)); }}>
        <div className="fp-tools" role="toolbar" aria-label="Acciones del bloque">
          <span className="fp-tool-grip" draggable title="Arrastrar para mover" onDragStart={e => { editor.onDragStart(i); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', b.id); const sec = (e.currentTarget as HTMLElement).closest('section'); if (sec) e.dataTransfer.setDragImage(sec, 40, 20); }} onDragEnd={editor.onDragEnd}>⋮⋮ Mover</span>
          <button type="button" onClick={() => editor.onMove(i, -1)} disabled={i === 0} title="Subir" aria-label="Subir">▲</button>
          <button type="button" onClick={() => editor.onMove(i, 1)} disabled={i === blocks.length - 1} title="Bajar" aria-label="Bajar">▼</button>
          <button type="button" onClick={() => editor.onDuplicate(i)} title="Duplicar" aria-label="Duplicar">⧉</button>
          <button type="button" onClick={() => editor.onToggle(i)} title="Ocultar" aria-label="Ocultar">👁</button>
          <button type="button" onClick={() => editor.onRemove(i)} title="Quitar" aria-label="Quitar">✕</button>
        </div>
        {el}
      </section>;
    })}
    <footer className="fp-footer"><Link href={`/propiedades/${p.slug}`}>Ver ficha completa</Link> · <Link href="/">Mi Casa</Link></footer>
  </div>;
}
