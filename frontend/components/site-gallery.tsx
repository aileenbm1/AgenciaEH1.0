"use client";
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { GalleryStyle } from '@/lib/site';

export type GalleryOptions = {
  style?: GalleryStyle; cols?: number; gap?: 'none' | 's' | 'l'; ratio?: 'original' | 'square' | '43' | '169'; corners?: 'square' | 'round';
  lightbox?: boolean; captions?: boolean; autoplay?: boolean; limit?: number; frame?: boolean; zoom?: boolean; mobileStrip?: boolean;
};

/**
 * Galería con 8 estilos (cuadrícula, mosaico, tira, muro, destacada, presentación, collage y antes/después).
 * Solo muestra fotos del sitio con <img>; los nombres se muestran como texto.
 * editing = dentro del editor: sin abrir en grande ni pasar solas.
 */
export default function SiteGallery({ images, names = [], o, title = 'Foto', editing = false }: { images: string[]; names?: string[]; o: GalleryOptions; title?: string; editing?: boolean }) {
  const style = o.style || 'grid';
  const [showAll, setShowAll] = useState(false);
  const [big, setBig] = useState<number | null>(null);
  const [cur, setCur] = useState(0);
  const [split, setSplit] = useState(50);
  const strip = useRef<HTMLDivElement>(null);
  const limit = Number(o.limit) || 0;
  const list = limit && !showAll && ['grid', 'mosaic', 'masonry'].includes(style) ? images.slice(0, limit) : images;
  const auto = !!o.autoplay && !editing && images.length > 1 && (style === 'slideshow' || style === 'strip' || style === 'featured');

  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => {
      if (style === 'strip' && strip.current) {
        const el = strip.current, end = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4;
        el.scrollTo({ left: end ? 0 : el.scrollLeft + el.clientWidth * 0.8, behavior: 'smooth' });
      } else setCur(c => (c + 1) % images.length);
    }, 4000);
    return () => clearInterval(t);
  }, [auto, style, images.length]);
  useEffect(() => {
    if (big === null) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(null); if (e.key === 'ArrowRight') setBig(b => b === null ? b : (b + 1) % images.length); if (e.key === 'ArrowLeft') setBig(b => b === null ? b : (b - 1 + images.length) % images.length); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  }, [big, images.length]);

  if (!images.length) return null;
  const open = (i: number) => { if (o.lightbox !== false && !editing) setBig(i); };
  const alt = (i: number) => names[i] || `${title} · foto ${i + 1}`;
  const cls = ['sg', `sg-s-${style}`, `sg-gap-${o.gap || 's'}`, `sg-r-${o.ratio || '43'}`, o.corners === 'square' ? 'sg-square' : '', o.frame ? 'sg-frame' : '', o.zoom ? 'sg-zoom' : '', o.mobileStrip && style !== 'strip' ? 'sg-mstrip' : ''].filter(Boolean).join(' ');
  const pic = (i: number, extra = '') => <figure key={images[i] + i} className={`sg-it ${extra}`}>
    <button type="button" onClick={() => open(i)} aria-label={o.lightbox !== false ? `Ver en grande: ${alt(i)}` : alt(i)} tabIndex={o.lightbox !== false ? 0 : -1}><img src={images[i]} alt={alt(i)} loading="lazy" /></button>
    {o.captions && names[i] && <figcaption>{names[i]}</figcaption>}
  </figure>;
  const arrows = (go: (d: number) => void) => <><button type="button" className="sg-arr l" onClick={() => go(-1)} aria-label="Anterior"><ChevronLeft size={20} /></button><button type="button" className="sg-arr r" onClick={() => go(1)} aria-label="Siguiente"><ChevronRight size={20} /></button></>;
  const step = (d: number) => setCur(c => (c + d + images.length) % images.length);

  let body: React.ReactNode;
  switch (style) {
    case 'strip':
      body = <div className="sg-strip-wrap"><div className="sg-strip" ref={strip}>{list.map((_, i) => pic(i))}</div>
        {arrows(d => strip.current?.scrollBy({ left: d * (strip.current.clientWidth * 0.8), behavior: 'smooth' }))}</div>;
      break;
    case 'featured':
      body = <><div className="sg-feat">{pic(cur, 'sg-main')}{images.length > 1 && arrows(step)}</div>
        <div className="sg-thumbs">{images.map((u, i) => <button key={u + i} type="button" className={i === cur ? 'on' : ''} onClick={() => setCur(i)} aria-label={`Ver ${alt(i)}`} aria-pressed={i === cur}><img src={u} alt="" loading="lazy" /></button>)}</div></>;
      break;
    case 'slideshow':
      body = <div className="sg-slide">{pic(cur, 'sg-main')}{images.length > 1 && <>{arrows(step)}<div className="sg-dots">{images.map((u, i) => <button key={u + i} type="button" className={i === cur ? 'on' : ''} onClick={() => setCur(i)} aria-label={`Foto ${i + 1}`} />)}</div></>}</div>;
      break;
    case 'collage':
      body = <div className="sg-collage">{list.slice(0, 3).map((_, i) => pic(i, i === 0 ? 'sg-tall' : ''))}</div>;
      break;
    case 'beforeafter': {
      const [a, b] = [images[0], images[1] || images[0]];
      body = <div className="sg-ba" style={{ ['--split' as string]: `${split}%` }}>
        <img src={b} alt={names[1] || 'Después'} />
        <div className="sg-ba-before"><img src={a} alt={names[0] || 'Antes'} /></div>
        <span className="sg-ba-line" aria-hidden><i>⇔</i></span>
        <small className="l">{names[0] || 'ANTES'}</small><small className="r">{names[1] || 'DESPUÉS'}</small>
        <input type="range" min={0} max={100} value={split} onChange={e => setSplit(Number(e.target.value))} aria-label="Comparar antes y después" />
      </div>;
      break;
    }
    case 'mosaic':
      body = <div className="sg-mosaic">{list.map((_, i) => pic(i, i === 0 ? 'sg-big' : ''))}</div>;
      break;
    case 'masonry':
      body = <div className="sg-masonry" style={{ columnCount: o.cols || 3 }}>{list.map((_, i) => pic(i))}</div>;
      break;
    default:
      body = <div className="sg-grid" style={{ gridTemplateColumns: `repeat(${o.cols || 3},minmax(0,1fr))` }}>{list.map((_, i) => pic(i))}</div>;
  }

  return <div className={cls}>
    {body}
    {limit > 0 && images.length > limit && ['grid', 'mosaic', 'masonry'].includes(style) && !showAll && <div className="center"><button type="button" className="button button-outline" onClick={() => setShowAll(true)}>Ver las {images.length} fotos</button></div>}
    {big !== null && <div className="sg-light" role="dialog" aria-modal="true" aria-label="Foto en grande" onClick={() => setBig(null)}>
      <button type="button" className="sg-light-x" aria-label="Cerrar"><X size={26} /></button>
      <figure onClick={e => e.stopPropagation()}><img src={images[big]} alt={alt(big)} />{names[big] && <figcaption>{names[big]} · {big + 1} / {images.length}</figcaption>}</figure>
      {images.length > 1 && <><button type="button" className="sg-arr l" onClick={e => { e.stopPropagation(); setBig((big - 1 + images.length) % images.length); }} aria-label="Anterior"><ChevronLeft size={26} /></button>
        <button type="button" className="sg-arr r" onClick={e => { e.stopPropagation(); setBig((big + 1) % images.length); }} aria-label="Siguiente"><ChevronRight size={26} /></button></>}
    </div>}
  </div>;
}
