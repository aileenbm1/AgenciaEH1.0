"use client";
import { CSSProperties, useEffect } from 'react';
import Link from 'next/link';
import { ApiProperty, OPERATION_LABEL } from '@/lib/properties';
import { mxn } from '@/lib/data';
import { Block, fill, FONTS, Theme, videoEmbed } from '@/lib/fanpage';
import PropertyContact from './property-contact';
import ShareButtons from './share-buttons';
import PropertyMap from './property-map';
import ReservationWidget from './reservation-widget';

type Track = (kind: 'VIEW' | 'SHARE' | 'CTA', channel?: string) => void;
const waNumber = (phone: string) => { const d = phone.replace(/\D/g, ''); return d.length === 10 ? `52${d}` : d; };

/**
 * Dibuja una fanpage a partir de bloques. Todo el texto se muestra como texto
 * (React lo escapa); no existe ningún bloque que inserte HTML o CSS.
 * preview = vista previa del editor: sin estadísticas ni envíos.
 */
export default function FanpageView({ property: p, theme, blocks, preview = false, campaign, source }: { property: ApiProperty; theme: Theme; blocks: Block[]; preview?: boolean; campaign?: string; source?: string }) {
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
        return <div className="fp-hero-in" style={img ? { backgroundImage: `linear-gradient(rgba(0,0,0,.25),rgba(0,0,0,.55)), url("${encodeURI(img)}")` } : undefined}>
          <span className="fp-eyebrow">{OPERATION_LABEL[p.operation].toUpperCase()} · {p.municipality.toUpperCase()}</span>
          <h1>{fill(b.title, p)}</h1>{b.subtitle && <p>{fill(b.subtitle, p)}</p>}
          {closed ? <p className="fp-badge">Ya no disponible</p> : button(b)}
        </div>;
      }
      case 'text': return <div className={`fp-inner fp-text ${b.align === 'center' ? 'center' : ''}`}>{b.title && <h2>{fill(b.title, p)}</h2>}{fill(b.body, p).split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)}</div>;
      case 'gallery': {
        const list: string[] = b.useProperty || !b.images?.length ? photos : b.images;
        if (!list.length) return null;
        return <div className="fp-inner">{b.title && <h2>{fill(b.title, p)}</h2>}<div className={`fp-gallery ${b.layout === 'mosaic' ? 'mosaic' : ''}`}>{list.map((u, i) => <a key={u + i} href={preview ? undefined : u} target="_blank" rel="noopener noreferrer"><img src={u} alt={`${p.title} · foto ${i + 1}`} loading="lazy" /></a>)}</div></div>;
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
        <div className="fp-amount">{mxn(Number(p.price))}<small>{isRent ? ' / mes' : ' MXN'}</small></div>
        {both && b.showRent && p.rentPrice ? <div className="fp-amount small">o renta {mxn(Number(p.rentPrice))}<small> / mes</small></div> : null}
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
          {preview ? <div className="fp-form-placeholder">Aquí aparece el calendario con la cotización y el botón para solicitar la reserva o el apartado.</div>
            : <ReservationWidget propertyId={p.id} slug={p.slug} operation={p.operation} />}</div>;
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
    {blocks.filter(b => !b.hidden).map(b => { const el = render(b); return el ? <section key={b.id} className={`fp-block fp-${b.type} bg-${b.bg || 'light'}`}>{el}</section> : null; })}
    <footer className="fp-footer"><Link href={`/propiedades/${p.slug}`}>Ver ficha completa</Link> · <Link href="/">Agencia EH</Link></footer>
  </div>;
}
