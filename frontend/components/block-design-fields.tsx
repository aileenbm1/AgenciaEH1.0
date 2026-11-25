"use client";
// Controles compartidos por los editores (sitio y fanpage): acomodo exacto y estilo de galería.
// Solo eligen entre opciones fijas; el servidor vuelve a validar todo.
import React, { useState } from 'react';
import { GALLERY_GAP, GALLERY_LIMITS, GALLERY_RATIO, GALLERY_STYLES, GalleryStyle, LAY_ALIGN, LAY_FOCUS, LAY_POS, LAY_POS_LABEL, LAY_SPACE, LAY_VERTICAL, LAY_WIDTH, LayPos, SiteBlockType } from '@/lib/site';

/** Cuadrícula de 9 lugares (arriba/centro/abajo × izquierda/centro/derecha). */
export function PosGrid({ value, onChange, photo, label }: { value?: string; onChange: (v: LayPos) => void; photo?: string; label: string }) {
  return <div className="se-pos" role="radiogroup" aria-label={label} style={photo ? { backgroundImage: `url('${photo}')` } : undefined}>
    {LAY_POS.map(p => <button key={p} type="button" role="radio" aria-checked={value === p} aria-label={LAY_POS_LABEL[p]} title={LAY_POS_LABEL[p]} className={value === p ? 'on' : ''} onClick={() => onChange(p)} />)}
  </div>;
}

export function Seg<T extends string>({ value, options, onChange, label, order }: { value: T | undefined; options: Record<T, string>; onChange: (v: T | undefined) => void; label: string; order?: T[] }) {
  return <div className="se-seg" role="radiogroup" aria-label={label}>{(order || Object.keys(options) as T[]).map(k => <button key={k} type="button" role="radio" aria-checked={value === k} className={value === k ? 'on' : ''} onClick={() => onChange(value === k ? undefined : k)}>{options[k]}</button>)}</div>;
}

export const DEFAULT_POS: Partial<Record<SiteBlockType, LayPos>> = { hero: 'ml', banner: 'ml' };

/** Acomodo exacto: posición (computadora y celular), alineación, ancho, alto, espacio y enfoque de la foto. Solo opciones fijas. */
export function LayoutFields({ b, set, vertical: vProp, focus: fProp, photo, defaultPos }: { b: Record<string, any>; set: (p: Record<string, unknown>) => void; vertical?: boolean; focus?: boolean; photo?: string; defaultPos?: LayPos }) {
  const [dev, setDev] = useState<'desk' | 'phone'>('desk');
  const key = dev === 'desk' ? 'pos' : 'posM';
  const cur = (b[key] || (dev === 'phone' ? b.pos : '') || defaultPos || DEFAULT_POS[b.type as SiteBlockType] || 'tl') as LayPos;
  const vertical = vProp ?? LAY_VERTICAL.includes(b.type);
  const h = Number(b.height) || 0;
  return <div className="se-lay">
    <div className="se-field"><div className="se-fh"><b>Posición del contenido</b><em>{LAY_POS_LABEL[cur]}</em></div>
      <div className="se-dev" role="group" aria-label="Para qué pantalla"><button type="button" className={dev === 'desk' ? 'on' : ''} aria-pressed={dev === 'desk'} onClick={() => setDev('desk')}>🖥 Computadora</button><button type="button" className={dev === 'phone' ? 'on' : ''} aria-pressed={dev === 'phone'} onClick={() => setDev('phone')}>📱 Celular</button></div>
      <div className="se-row-pos"><PosGrid label="Posición del contenido" value={b[key] || (dev === 'phone' && !b.posM ? undefined : cur)} onChange={v => set({ [key]: v })} />
        <p className="muted small">{dev === 'phone' ? (b.posM ? 'En celular se usa esta posición.' : 'Igual que en computadora. Toca un cuadro para poner otra solo en celular.') : 'Toca uno de los 9 lugares.'}{!vertical && !h ? ' Arriba/abajo se nota cuando le das más alto a la sección.' : ''}</p></div>
      {b[key] && <button type="button" className="inline-link" onClick={() => set({ [key]: undefined })}>{dev === 'phone' ? 'Usar la misma que en computadora' : 'Volver a la posición original'}</button>}
    </div>
    <div className="se-field"><div className="se-fh"><b>Alineación del texto</b></div><Seg label="Alineación del texto" value={b.align} options={LAY_ALIGN} onChange={v => set({ align: v })} /></div>
    <div className="se-field"><div className="se-fh"><b>Ancho del texto</b><em>{b.width ? LAY_WIDTH[b.width as keyof typeof LAY_WIDTH] : 'Original'}</em></div><Seg label="Ancho del texto" value={b.width} options={LAY_WIDTH} onChange={v => set({ width: v })} /></div>
    <div className="se-field"><div className="se-fh"><b>Alto de la sección</b><em>{h ? (h >= 100 ? 'Pantalla completa' : `${h}% de la pantalla`) : 'Automático'}</em></div>
      <input type="range" min={0} max={100} step={5} value={h} onChange={e => set({ height: Number(e.target.value) < 10 ? undefined : Number(e.target.value) })} aria-label="Alto de la sección" />
      <div className="se-mini"><span>Automático</span><span>Media pantalla</span><span>Completa</span></div></div>
    <div className="se-field"><div className="se-fh"><b>Espacio arriba y abajo</b></div><Seg label="Espacio" value={b.space} options={LAY_SPACE} onChange={v => set({ space: v })} /></div>
    {(fProp ?? LAY_FOCUS.includes(b.type)) && <div className="se-field"><div className="se-fh"><b>Enfoque de la foto</b><em>{b.focus ? LAY_POS_LABEL[b.focus as LayPos] : 'Centro'}</em></div>
      <div className="se-row-pos"><PosGrid label="Enfoque de la foto" photo={photo ?? (b.imageUrl || undefined)} value={b.focus || 'mc'} onChange={v => set({ focus: v === 'mc' ? undefined : v })} /><p className="muted small">La parte de la foto que nunca se recorta (por ejemplo, la puerta o la fachada).</p></div></div>}
  </div>;
}

/** Mini dibujo de cada estilo de galería para elegirlo de un vistazo. */
export const GAL_ICON: Record<GalleryStyle, React.ReactNode> = {
  grid: <i className="gi gi-grid">{Array.from({ length: 6 }, (_, k) => <b key={k} />)}</i>,
  mosaic: <i className="gi gi-mosaic"><b /><b /><b /><b /><b /></i>,
  strip: <i className="gi gi-strip"><b /><b /><b /></i>,
  masonry: <i className="gi gi-masonry"><b style={{ height: 14 }} /><b style={{ height: 9 }} /><b style={{ height: 10 }} /><b style={{ height: 15 }} /><b style={{ height: 12 }} /><b style={{ height: 8 }} /></i>,
  featured: <i className="gi gi-featured"><b /><span><b /><b /><b /><b /></span></i>,
  slideshow: <i className="gi gi-slide"><b /><span>• • •</span></i>,
  collage: <i className="gi gi-collage"><b /><b /><b /></i>,
  beforeafter: <i className="gi gi-ba"><b /><b /></i>,
};

export function GalleryStyleFields({ b, set }: { b: Record<string, any>; set: (p: Record<string, unknown>) => void }) {
  const style = (b.style || 'grid') as GalleryStyle;
  const chk = (k: string, label: string, def = false) => <label className="check"><input type="checkbox" checked={b[k] ?? def} onChange={e => set({ [k]: e.target.checked })} /> {label}</label>;
  return <>
    <div className="se-fh"><b>Estilo de la galería</b><em>{GALLERY_STYLES[style].label}</em></div>
    <div className="se-gal-styles" role="radiogroup" aria-label="Estilo de la galería">{(Object.keys(GALLERY_STYLES) as GalleryStyle[]).map(k =>
      <button key={k} type="button" role="radio" aria-checked={style === k} className={style === k ? 'on' : ''} onClick={() => set({ style: k })} title={GALLERY_STYLES[k].help}>{GAL_ICON[k]}<span>{GALLERY_STYLES[k].label}</span></button>)}</div>
    <p className="muted small">{GALLERY_STYLES[style].help}</p>
    {(style === 'grid' || style === 'masonry') && <div className="se-field"><div className="se-fh"><b>Columnas</b></div><Seg label="Columnas" value={String(b.cols || 3) as '2' | '3' | '4' | '5'} options={{ '2': '2', '3': '3', '4': '4', '5': '5' }} onChange={v => set({ cols: Number(v || 3) })} /></div>}
    <div className="se-field"><div className="se-fh"><b>Espacio entre fotos</b></div><Seg label="Espacio entre fotos" value={b.gap || 's'} options={GALLERY_GAP} onChange={v => set({ gap: v || 's' })} /></div>
    {style !== 'masonry' && style !== 'beforeafter' && <div className="se-field"><div className="se-fh"><b>Forma de las fotos</b></div><Seg label="Forma de las fotos" value={b.ratio || '43'} options={GALLERY_RATIO} order={['original', 'square', '43', '169']} onChange={v => set({ ratio: v || '43' })} /></div>}
    <div className="se-field"><div className="se-fh"><b>Esquinas</b></div><Seg label="Esquinas" value={b.corners || 'round'} options={{ square: 'Rectas', round: 'Redondeadas' }} onChange={v => set({ corners: v || 'round' })} /></div>
    <div className="se-checks">
      {chk('lightbox', 'Al tocar, abrir en grande', true)}
      {chk('captions', 'Mostrar el nombre de cada foto')}
      {(style === 'strip' || style === 'slideshow' || style === 'featured') && chk('autoplay', 'Pasar solas cada 4 segundos', true)}
      {chk('frame', 'Marco de color alrededor')}
      {chk('zoom', 'Acercar al pasar el mouse')}
      {style !== 'strip' && chk('mobileStrip', 'En celular, mostrarla como tira deslizable')}
    </div>
    {(style === 'grid' || style === 'mosaic' || style === 'masonry') && <label>Cuántas mostrar al inicio<select value={b.limit || 0} onChange={e => set({ limit: Number(e.target.value) })}>{GALLERY_LIMITS.map(n => <option key={n} value={n}>{n ? `Las primeras ${n} (con botón “Ver todas”)` : 'Todas'}</option>)}</select></label>}
  </>;
}
